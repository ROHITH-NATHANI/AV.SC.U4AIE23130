const http = require('http');

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        const token = process.env.API_TOKEN || "";
        const options = {
            hostname: '20.207.122.201',
            path: path,
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsedData = JSON.parse(data);
                        resolve(parsedData);
                    } catch (e) {
                        reject(new Error(`Failed to parse JSON response for ${path}`));
                    }
                } else {
                    reject(new Error(`API Error for ${path}: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
}

function getMockData() {
    const mockDepots = [
        {"ID": 1, "MechanicHours": 60},
        {"ID": 2, "MechanicHours": 135},
        {"ID": 3, "MechanicHours": 188},
        {"ID": 4, "MechanicHours": 97},
        {"ID": 5, "MechanicHours": 164}
    ];
    
    const mockVehicles = [
        {"TaskID": "264e638f-1c7a-4d67-9f9c-53f3d1766d37", "Duration": 1, "Impact": 5},
        {"TaskID": "73ce9dca-1536-4a7a-9f1e-c67083afad61", "Duration": 6, "Impact": 2},
        {"TaskID": "4b6e22ee-b4ed-45a4-a6af-5294b0d69f37", "Duration": 1, "Impact": 3},
        {"TaskID": "d6372f32-852b-46a9-8e8c-e730fecc3c22", "Duration": 5, "Impact": 5},
        {"TaskID": "ec40b581-bdfc-43e0-a047-871fdefe8167", "Duration": 7, "Impact": 3},
        {"TaskID": "fb1e3165-67c9-4e96-a5c3-2d20085d293b", "Duration": 6, "Impact": 3},
        {"TaskID": "330065c0-3815-4e10-a18a-b93b117e30a8", "Duration": 5, "Impact": 1},
        {"TaskID": "72a91abc-4ed7-492c-9e99-348e7437953b", "Duration": 5, "Impact": 9},
        {"TaskID": "8a7ff5b1-335c-4a2f-96d8-09c4a362e781", "Duration": 6, "Impact": 10},
        {"TaskID": "18c655b2-380d-4295-8905-863f0de32c8f", "Duration": 2, "Impact": 9},
        {"TaskID": "436e87a6-2b5b-42b9-9c35-deaa2c8ef54e", "Duration": 2, "Impact": 3},
        {"TaskID": "0a823f1b-03c3-4722-af40-e17a7b9ee0ff", "Duration": 2, "Impact": 5},
        {"TaskID": "0bf780cb-1099-4f61-99bf-dec95a7063b6", "Duration": 3, "Impact": 10},
        {"TaskID": "e716fb11-1064-4db7-9d76-06d19f4f6f67", "Duration": 5, "Impact": 5},
        {"TaskID": "60586e47-ab9c-407d-85ca-1215084f3f41", "Duration": 8, "Impact": 8},
        {"TaskID": "08635e52-dad5-4b78-8ab1-e55db53c0c18", "Duration": 8, "Impact": 5},
        {"TaskID": "871ddcf5-0bba-4233-bf12-c776c496e314", "Duration": 7, "Impact": 10},
        {"TaskID": "b57f17dc-db77-42bf-a7e9-8fec596ce498", "Duration": 7, "Impact": 1},
        {"TaskID": "1d893de7-fbba-4c77-927b-e3076fe805d5", "Duration": 1, "Impact": 8},
        {"TaskID": "1743e1b5-9dfd-450b-9905-98c3e054aee1", "Duration": 5, "Impact": 8},
        {"TaskID": "48851915-eaf5-48ec-a20c-5074d7050c5f", "Duration": 8, "Impact": 8},
        {"TaskID": "7d81e6ca-8f03-4c4a-9ec0-701f820c5655", "Duration": 7, "Impact": 8}
    ];
    return { depots: mockDepots, vehicles: mockVehicles };
}

function knapsack(budget, vehicles) {
    const n = vehicles.length;
    // dp[i][w] represents max impact for first i vehicles with budget w
    const dp = Array(n + 1).fill(null).map(() => Array(budget + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
        const vehicle = vehicles[i - 1];
        const duration = vehicle.Duration;
        const impact = vehicle.Impact;
        
        for (let w = 0; w <= budget; w++) {
            if (duration <= w) {
                dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - duration] + impact);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }
    
    // Reconstruct the selected tasks
    const selectedTasks = [];
    let w = budget;
    const totalImpact = dp[n][budget];
    let totalDuration = 0;
    
    for (let i = n; i > 0; i--) {
        if (dp[i][w] !== dp[i - 1][w]) {
            const vehicle = vehicles[i - 1];
            selectedTasks.push(vehicle.TaskID);
            w -= vehicle.Duration;
            totalDuration += vehicle.Duration;
        }
    }
    
    return { selectedTasks, totalImpact, totalDuration };
}

async function main() {
    let depots = [];
    let vehicles = [];
    
    try {
        const depotsData = await fetchJson('/evaluation-service/depots');
        depots = depotsData.depots || [];
        
        const vehiclesData = await fetchJson('/evaluation-service/vehicles');
        vehicles = vehiclesData.vehicles || [];
    } catch (e) {
        console.log(`Failed to fetch from API: ${e.message}`);
        console.log("Using mock data based on screenshots...");
        const mockData = getMockData();
        depots = mockData.depots;
        vehicles = mockData.vehicles;
    }
    
    if (depots.length === 0 || vehicles.length === 0) {
        console.log("Missing data. Cannot proceed.");
        return;
    }
    
    // Calculate daily mechanic-hour budget
    const totalBudget = depots.reduce((sum, d) => sum + (d.MechanicHours || 0), 0);
    
    console.log(`Total available mechanic-hours (budget): ${totalBudget}`);
    console.log(`Total vehicles requesting maintenance: ${vehicles.length}\n`);
    
    // Solve Knapsack
    const { selectedTasks, totalImpact, totalDuration } = knapsack(totalBudget, vehicles);
    
    console.log("=".repeat(80));
    console.log("VEHICLE MAINTENANCE SCHEDULER - OPTIMAL SUBSET".padStart(60));
    console.log("=".repeat(80));
    console.log(`Total Selected Tasks: ${selectedTasks.length}`);
    console.log(`Total Used Mechanic-Hours: ${totalDuration} / ${totalBudget}`);
    console.log(`Total Operational Impact Score: ${totalImpact}`);
    console.log("-".repeat(80));
    console.log("Selected Task IDs:");
    selectedTasks.forEach(taskId => {
        console.log(` - ${taskId}`);
    });
    console.log("=".repeat(80) + "\n");
}

main();
