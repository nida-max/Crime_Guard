const express = require("express");
const path = require("path");
const { body, validationResult } = require("express-validator");
const { User, Report, Feedback } = require("./mongo");
const nodemailer = require("nodemailer");
const cron = require('node-cron');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const storage = multer.diskStorage({
  destination: './uploads/', // Specify the path to the uploads folder
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Initialize multer with the storage engine
const upload = multer({ storage: storage });

const app = express();
const port = process.env.PORT || 4000;



app.use(session({
  secret: '12345',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 180 * 60 * 1000 } // 3 hours
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files
const publicPath = path.join(__dirname, '../public');
const picPath = path.join(__dirname, '../pic');
const api = path.join(__dirname, '../api');
const reportsDir = path.join(__dirname, 'reports');

// Check if the directory exists
if (!fs.existsSync(reportsDir)) {
  // Create the directory if it doesn't exist
  fs.mkdirSync(reportsDir);
}

app.use(express.static(publicPath));
app.use('/pic', express.static(picPath));

// View engine setup
const templatePath = path.join(__dirname, '../templates');
app.set('views', templatePath);
app.set('view engine', 'hbs');

// Routes
app.get('/:page', (req, res) => {
  const page = req.params.page;
 // Add this line for debugging
  if (page === 'favicon.ico' || page === 'style.css') {
    return res.status(404).send('Not Found'); // Return a 404 response for favicon.ico
  }
  res.render(page, (err, html) => {
    if (err) {
      console.error("Error rendering page:", err);
      res.status(500).send('Internal Server Error');
    } else {
      res.send(html);
    }
  });
});



app.get('/', (req, res) => {
  res.render('log')
});

app.get('home', (req, res) => {
  res.render('home')
});

app.get('/signup', (req, res) => {
  res.render('signup')
});

app.get('/login', (req, res) => {
  res.render('login')
});
app.get('/dashboard', (req, res) => {
  res.render('dashboard')
});

app.get('/api/dashboard_stats', async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const resolvedReports = await Report.countDocuments({ status: 'resolved' });
    const totalFeedback = await Feedback.countDocuments();
    const averageFeedback = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ]);

    const responseData = {
      success: true,
      data: {
        reports: {
          total_reported: totalReports,
          resolved_reported: resolvedReports,
        },
        total_feedback: totalFeedback,
        feedback_avg: averageFeedback.length ? averageFeedback[0].avgRating : 0,
      }
    };

    res.json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
app.get('/api/highest-crime-area', async (req, res) => {
  try {
    const highestCrimeAreas = await Report.aggregate([
      { $group: { _id: "$area", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({ success: true, data: highestCrimeAreas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});




app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    res.json({ success: true, data: feedbacks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find();
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/update_report', [
  body('_id').notEmpty(),
  body('status').notEmpty()
], async (req, res) => {
  // Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Extract data from request body
  const { _id, status } = req.body;

  try {
    // Update the report status in the database
    await Report.findByIdAndUpdate(_id, { status });

    // Send a success response
    res.json({ success: true, message: 'Report status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred while updating report status' });
  }
});





app.get('/contactus', (req, res) => {
  res.render('contactus')
});
app.post('/contactus', async (req, res) => {
    const { feedback, rating } = req.body;

    if (!feedback || !rating) {
        return res.status(400).json({ success: false, message: 'Invalid feedback data' });
    }

    try {
        const newFeedback = new Feedback({ feedback, rating });
        const result = await newFeedback.save();
        res.status(200).json({ success: true, message: 'Thank you for your valuable feedback.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error saving feedback' });
    }
});



// Middleware to check if user is authenticated
const requireLogin = (req, res, next) => {
  if (req.session && req.session.userId) {
    // User is authenticated, allow access to the next middleware
    next();
  } else {
    // User is not authenticated, redirect to the login page
    res.redirect('/login');
  }
};

// Route to handle access to the report page
app.get('/report', requireLogin, (req, res) => {
  // Render the report page if the user is authenticated
  res.render('report');
});


app.post('/signup',async (req, res) => {
  const data = {
    fname: req.body.fname,
    lname: req.body.lname,
    email: req.body.email,
    gender: req.body.gender,
    password: req.body.password,
  };

  try {
    const checking = await User.findOne({ email: req.body.email });
    if (checking) {
      return res.status(400).json({ message: "User already exists" });
    } else {
      await User.create(data);
      res.redirect('login');
    }
  } catch {
    res.status(500).json({ message: "An error occurred while processing your request" });
  }
});

app.post('/login', async (req, res) => {
  try {
    const check = await User.findOne({ email: req.body.email });
    if (!check) {
      return res.status(400).json({ message: "User not found" });
    }
    if (check.password === req.body.password) {
      req.session.userId = check._id; // Set user ID in the session
      req.session.email = check.email; // Optionally store the email in the session

      if (check.email === "nidatariq865@gmail.com") {
        res.redirect('/dashboard');
      } else {
        res.redirect('/home');
      }
    } else {
      return res.status(400).json({ message: "Incorrect password" });
    }
  } catch (e) {
    return res.status(400).json({ message: "Wrong details" });
  }
});

function generateUniqueToken() {
  return Math.random().toString(36).substr(2, 9);
}

app.post('/report', upload.array('evidence'), [
  body("subject").notEmpty(),
  body("type").notEmpty(),
  body("area").notEmpty(),
  body("date").notEmpty(),
  body("guilty").notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { subject, type, area, date, guilty, description } = req.body;

  try {
    // Create the report document
    const doc = new PDFDocument();
    const reportFilename = `report_${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, 'reports', reportFilename);

    // Add logo and title
    const logoPath = path.join(__dirname, '..', 'pic', 'h.png');
    doc.image(logoPath, 50, 50, { width: 50 })
       .fontSize(24).font('Helvetica-Bold').text('Crime Guard', 120, 65)
       .moveDown(1);

    // Add report details
    doc.fontSize(18).font('Helvetica-Bold').text('Crime Report', { align: 'center' })
       .moveDown(1)
       .fontSize(12).font('Helvetica')
       .text(`Subject: ${subject}`, { align: 'center' })
       .text(`Type: ${type}`, { align: 'center' })
       .text(`Area: ${area}`, { align: 'center' })
       .text(`Date: ${new Date(date).toLocaleDateString()}`, { align: 'center' })
       .text(`Guilty: ${guilty}`, { align: 'center' })
       .text(`Description: ${description}`, { align: 'center' })
       .moveDown(1);

    // Generate unique token
    const token = generateUniqueToken();
    doc.font('Helvetica-Bold').text(`Token: ${token}`, { align: 'center' });

    // Display evidence images (if provided)
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const evidenceImagePath = path.join(__dirname, '..', 'uploads', file.filename);
        doc.addPage().image(evidenceImagePath, { fit: [600, 600], align: 'center' });
      });
    }

    // Finalize the PDF document
    doc.end();

    // Ensure the reports directory exists
    if (!fs.existsSync(path.join(__dirname, 'reports'))) {
      fs.mkdirSync(path.join(__dirname, 'reports'));
    }

    // Pipe the PDF to a file
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    writeStream.on('finish', async () => {
      // Store the report details in the database
      const report = new Report({ subject, type, area, date, guilty, description, reportFilename, token });
      await report.save();

      // Send the report as a response to the user's request
      res.setHeader('Content-disposition', `attachment; filename="${reportFilename}"`);
      res.setHeader('Content-type', 'application/pdf');
      fs.createReadStream(outputPath).pipe(res);
    });

    writeStream.on('error', (err) => {
      console.error(err);
      res.status(500).send('An error occurred while submitting the report');
    });

  } catch (error) {
    console.error(error);
    return res.status(500).send('An error occurred while submitting the report');
  }
});









// Send Emails using Nodemailer
const sendEmails = async () => {
  const mostRepeatedArea = await Report.aggregate([
    { $group: { _id: "$area", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);

  const users = await User.find({}, { email: 1 });
  const userEmails = users.map(user => user.email);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'nidatariq865@gmail.com',
      pass: 'pjut tqir ucyg qfoz'
    }
  });

  const organizationName = 'Crime Guard';
  const fromEmail = 'nidatariq865@gmail.com';
  
  const mailOptions = {
    from: `${organizationName} <${fromEmail}>`,
    to: userEmails.join(','),
    subject: 'Important Alert: High Frequency Area Detected',
    text: `Dear Citizen,\n\nWe have detected a high frequency of reports in the area of ${mostRepeatedArea[0]._id}. This requires immediate attention and action from our end.\n\nPlease review the situation and take necessary actions to address any underlying issues.\n\nThank you for your cooperation.\n\nBest regards,\n${organizationName}`
  };
  

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

// Schedule Script Execution
cron.schedule('0 9 * * 1', () => {
  sendEmails();
}, {
  timezone: "Asia/Karachi" 
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
