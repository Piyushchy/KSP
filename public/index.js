const map = L.map('map').setView([12.9999, 77.5946], 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

Papa.parse('AccidentsBig.csv', {
    download: true,
    header: false,
    dynamicTyping: true,
    complete: (results) => {
        results.data.shift();
        const accidentsByDay = [0, 0, 0, 0, 0, 0, 0];
        results.data.forEach((row) => {
            const dayOfWeek = row[7];
            if (!isNaN(dayOfWeek)) {
                accidentsByDay[dayOfWeek - 1]++;
            }

            if (!isNaN(row[1]) && !isNaN(row[2])) {
                const data = `lat: ${row[2]}, lon: ${row[1]}
                    <br>accident severity: ${row[4]}
                    <br>number of vehicles: ${row[5]}
                    <br>number of casualties: ${row[6]}
                    <br>day of week: ${row[7]}
                    <br>date: ${row[29]}
                    <br>time: ${row[8]}
                    <br>speed limit: ${row[14]}
                    <br>weather conditions: ${weatherConditions[row[22]]}
                    <br>light conditions: ${lightConditions[row[21]]}
                `;
                const marker = L.marker([row[2], row[1]]).addTo(map).bindPopup(data);
                marker.on('click', () => {
                    document.getElementsByClassName('in-btn')[0].disabled = false;
                    currentMarkerData = {
                        severity: row[4],
                        vehicles: row[5],
                        casualties: row[6],
                        dayOfWeek: row[7],
                        date: row[29],
                        time: row[8],
                        speedLimit: row[14],
                        weatherConditions: weatherConditions[row[22]],
                        lightConditions: lightConditions[row[21]]
                    };
                });
            } else {
                console.error("Invalid data: ", row);
            }
        });
        drawChart(accidentsByDay);
    }
});

const drawChart = (accidentsByDay) => {
    const ctx = document.getElementById('accidentChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            datasets: [{
                label: 'Number of Accidents',
                data: accidentsByDay,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 99, 132, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
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

const weatherConditions = {
    0: "Sunny",
    1: "Partly Cloudy",
    2: "Cloudy",
    3: "Rainy",
    4: "Stormy"
};

const lightConditions = {
    0: "Bright",
    1: "Normal",
    2: "Dim",
    3: "Dark",
    4: "Very Dark"
};

let currentMarkerData;
const infraImprovementsText = document.getElementsByClassName('ii-text')[0];
const insightsText = document.getElementsByClassName('in-text')[0];
const trafficDeploymentText = document.getElementsByClassName('td-text')[0];

const getInsights = async () => {
    if (currentMarkerData !== undefined) {
        const infraPrompt = `based on the ${JSON.stringify(currentMarkerData)} data, suggest infrastructure improvements to reduce accidents in single paragraph`;
        const insightPrompt = `based on the ${JSON.stringify(currentMarkerData)} data, give a small summary in very few words, speed is in kmph`;
        const trafficPrompt = `based on the ${JSON.stringify(currentMarkerData)} data , can you suggest some traffic deployment plans in a single short paragraph to lower accidents.`;
        infraImprovementsText.innerText = "Loading...";
        insightsText.innerText = "Loading...";

        fetch(`/api/v1/insights?inputString=${encodeURIComponent(infraPrompt)}`, {
            method: 'GET'
        })
        .then((response) => response.json())
            .then((data) => {
            infraImprovementsText.innerText = data.choices[0].message.content;
        })
        .catch((error) => console.error(error));
        
        fetch(`/api/v1/insights?inputString=${encodeURIComponent(insightPrompt)}`, {
            method: 'GET'
        })
        .then((response) => response.json())
            .then((data) => {
            insightsText.innerText = data.choices[0].message.content;
        })
        .catch((error) => console.error(error));
        
        fetch(`/api/v1/insights?inputString=${encodeURIComponent(trafficPrompt)}`, {
            method: 'GET'
        })
        .then((response) => response.json())
            .then((data) => {
            trafficDeploymentText.innerText = data.choices[0].message.content;
        })
        .catch((error) => console.error(error));
    }
};

Papa.parse("AccidentsBig.csv", {
    download: true,
    header: true,
    complete: function(results) {
        var data = results.data;
        var accidentClusters = {};
        var threshold = 3;

        data.forEach(function(row) {
            var lat = parseFloat(row.latitude);
            var lon = parseFloat(row.longitude);

            var key = Math.round(lat * 100) / 100 + "_" + Math.round(lon * 100) / 100;

            if (!accidentClusters[key]) {
                accidentClusters[key] = {
                    count: 0,
                    lat: lat,
                    lon: lon
                };
            }

            accidentClusters[key].count++;
        });

        for (var key in accidentClusters) {
            var cluster = accidentClusters[key];
            if (cluster.count > threshold) {
                var circle = L.circle([cluster.lat, cluster.lon], {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 0.5,
                    radius: cluster.count * 100
                }).addTo(map);
            }
        }
    }
});