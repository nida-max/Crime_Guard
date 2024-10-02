const { validationResult } = require("express-validator");
const { Report } = require("./mongo");

// Controller function to report a crime
async function reportCrime(req, res) {
    try {
        // Perform any required validation on request body here

        // Create a new crime report document in the database
        const newReport = await Report.create(req.body);

        // Send a success response
        return res.status(201).json({ success: true, message: "Crime reported successfully", data: newReport });
    } catch (error) {
        // Handle errors
        console.error("Error reporting crime:", error);
        return res.status(500).json({ success: false, message: "An error occurred while reporting the crime" });
    }
}

// Controller function to update the status of a report
async function updateReportStatus(req, res) {
    try {
        // Perform any required validation on request body here

        // Update the status of the report in the database
        const updatedReport = await Report.findByIdAndUpdate(req.body._id, { status: req.body.status }, { new: true });

        // Check if the report was found and updated
        if (!updatedReport) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        // Send a success response
        return res.status(200).json({ success: true, message: "Report status updated successfully", data: updatedReport });
    } catch (error) {
        // Handle errors
        console.error("Error updating report status:", error);
        return res.status(500).json({ success: false, message: "An error occurred while updating report status" });
    }
}

// Controller function to retrieve all crime reports
async function getCrimeReports(req, res) {
    try {
        // Fetch all crime reports from the database
        const reports = await Report.find();

        // Send a success response with the retrieved reports
        return res.status(200).json({ success: true, data: reports });
    } catch (error) {
        // Handle errors
        console.error("Error fetching crime reports:", error);
        return res.status(500).json({ success: false, message: "An error occurred while fetching crime reports" });
    }
}

// Controller function to retrieve dashboard statistics
async function getDashboardStats(req, res) {
    try {
        // Implement logic to fetch and calculate dashboard statistics
        // Assuming this logic is correctly implemented and returns desired statistics

        const dashboardStats = {
            reports: {
                total_reported: 100, // Example value, replace with actual value
                resolved_reported: 80 // Example value, replace with actual value
            },
            total_feedback: 50, // Example value, replace with actual value
            feedback_avg: 4.5, // Example value, replace with actual value
            reports_type: [
                { type: "Theft", count: 20, status: "pending" },
                { type: "Assault", count: 30, status: "completed" },
                // Example values, replace with actual values for each report type
            ]
        };

        // Send a success response with the dashboard statistics
        return res.status(200).json({ success: true, data: dashboardStats });
    } catch (error) {
        // Handle errors
        console.error("Error fetching dashboard statistics:", error);
        return res.status(500).json({ success: false, message: "An error occurred while fetching dashboard statistics" });
    }
}

module.exports = {
    reportCrime,
    updateReportStatus,
    getCrimeReports,
    getDashboardStats
};
