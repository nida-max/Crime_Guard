

function logout() {
  localStorage.removeItem("token");
  window.location.href = '/Home';
}



function getFeedback() {
  axios.get('/api/feedback')
    .then(response => {
      if (response.data && response.data.success) {
        let tbody = document.getElementById("feedback-body");
        if (response.data.data.length > 0) {
          tbody.innerHTML = '';
          response.data.data.forEach((feedback, index) => {
            let filledStars = '';
            for (let i = 0; i < feedback.rating; i++) {
              filledStars += '<i class="fa-solid fa-star filled-yellow"></i>';
            }
            let emptyStars = '';
            for (let i = feedback.rating; i < 5; i++) {
              emptyStars += '<i class="fa-solid fa-star filled-silver"></i>';
            }

            tbody.innerHTML += `
              <tr>
                <td>${index + 1}</td>
                <td>
                  ${filledStars}
                  ${emptyStars}
                </td>
                <td>${feedback.feedback}</td>
              </tr>
            `;
          });
        } else {
          tbody.innerHTML = `<tr><td colspan="3">No data found</td></tr>`;
        }
      } 
    })
    .catch(error => {
      console.error('Error:', error);
     
    });
}

document.addEventListener('DOMContentLoaded', getFeedback);




function getReport() {
  axios.get('/api/reports')
    .then(response => {
      if (response.data && response.data.success) {
        let tbody = document.getElementById("report-body");
        if (response.data.data.length > 0) {
          tbody.innerHTML = '';
          response.data.data.forEach((report, index) => {
            // Format crime_date
            const crimeDate = new Date(report.date);
            const formattedCrimeDate = crimeDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });

            // Format created_at
            const createdAt = new Date(report.created_at);
            const formattedCreatedAt = createdAt.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });

            tbody.innerHTML += `
              <tr>
                <td>${index + 1}</td>
                <td><a href="${report.files[0]?.path || '#'}" target="_blank"><img src="${report.files[0]?.path || ''}" alt="Img" style="width: 50px; height: 50px;"></a></td>
                <td>${report.subject}</td>
                <td>${report.guilty}</td>
                <td>${report.area}</td>
                <td>${report.type}</td>
                <td><span class="badge ${report.status === 'pending' ? 'badge-warning' : 'badge-success'}">${report.status}</span></td>
                <td class="description">${report.description}</td>
                <td>${formattedCrimeDate}</td>
                <td>${formattedCreatedAt}</td>
                <td>
                  ${report.status === 'pending' ? `<button class="btn-action-warning" onclick="markComplete('${report._id}')" title="Mark as completed"><i class="fa-solid fa-question"></i></button>` : `<button class="btn-action-success" title="Completed"><i class="fa-solid fa-check"></i></button>`}
                </td>
              </tr>
            `;
          });
        } else {
          tbody.innerHTML = `<tr><td colspan="11">No data found</td></tr>`;
        }
      } else {
        alert("Server error. Please try again later.");
      }
    })
    .catch(error => {
      console.error('Error:', error);
      
    });
}

document.addEventListener('DOMContentLoaded', getReport);



function validateEmail(email) {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}






function markComplete(reportId) {
  let data = {
    _id: reportId,
    status: "completed"
  }

  let token = JSON.parse(localStorage.getItem("token"));
  axios.post('/api/update_report', data, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => {
      if (response.data && response.data.success) {
        // Find the button corresponding to the marked report and update its appearance
        let button = document.querySelector(`button[data-report-id="${reportId}"]`);
        if (button) {
          button.classList.remove('btn-action-warning');
          button.classList.add('btn-action-success');
          button.setAttribute('title', 'Completed');
          button.innerHTML = '<i class="fa-solid fa-check"></i>';
          // Disable the button to prevent further actions
          button.disabled = true;
        }
      }
    })
    .catch(error => {
      console.error('Error:', error);
    
    });
}


function getDashboardData() {
  axios.get('/api/dashboard_stats')
    .then(response => {
      if (response.data && response.data.success) {
        // Extract data from the response
        const { reports, total_feedback, feedback_avg } = response.data.data;

        // Update HTML elements with dashboard statistics
        document.getElementById("no-of-reports").innerHTML = reports.total_reported;
        document.getElementById("likes").innerHTML = total_feedback;
        document.getElementById("comments").innerHTML = feedback_avg.toFixed(2);
        document.getElementById("crimes-area").innerHTML = reports.resolved_reported;

        // Fetch and display chart data
        getCrimeAreaChartData();
      } else {
        console.error('Failed to fetch dashboard stats:', response.data.message);
      }
    })
    .catch(error => {
      console.error('Error fetching dashboard stats:', error);
    });
}

function getCrimeAreaChartData() {
  axios.get('/api/highest-crime-area')
    .then(response => {
      if (response.data && response.data.success) {
        const crimeData = response.data.data;

        // Assuming crimeData is an array of objects with _id (area) and count (number of crimes)
        const labels = crimeData.map(item => item._id);
        const data = crimeData.map(item => item.count);

        displayCrimeAreaChart(labels, data);
      } else {
        console.error('Failed to fetch crime area data:', response.data.message);
      }
    })
    .catch(error => {
      console.error('Error fetching crime area data:', error);
    });
}

function displayCrimeAreaChart(labels, data) {
  const ctx = document.getElementById('crimeAreaChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar', // or 'line', 'pie', etc.
    data: {
      labels: labels,
      datasets: [{
        label: 'Number of Crimes',
        data: data,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}


