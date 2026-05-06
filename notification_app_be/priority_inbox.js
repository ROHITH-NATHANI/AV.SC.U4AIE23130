const http = require('http');

function fetchNotifications() {
    return new Promise((resolve, reject) => {
        const token = process.env.API_TOKEN || "";
        const options = {
            hostname: '20.207.122.201',
            path: '/evaluation-service/notifications',
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
                        resolve(parsedData.notifications || []);
                    } catch (e) {
                        reject(new Error("Failed to parse JSON response"));
                    }
                } else {
                    reject(new Error(`API Error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
}

function getMockNotifications() {
    return [
        {"ID": "1", "Type": "Result", "Message": "Sem 4 Results are out", "Timestamp": "2026-04-22 17:50:54"},
        {"ID": "2", "Type": "Placement", "Message": "Google On-Campus", "Timestamp": "2026-04-21 10:00:00"},
        {"ID": "3", "Type": "Event", "Message": "Tech Fest 2026", "Timestamp": "2026-04-22 18:00:00"},
        {"ID": "4", "Type": "Placement", "Message": "Amazon OA", "Timestamp": "2026-04-22 19:30:00"},
        {"ID": "5", "Type": "Result", "Message": "Internal Marks Uploaded", "Timestamp": "2026-04-20 09:15:00"},
        {"ID": "6", "Type": "Event", "Message": "Guest Lecture on AI", "Timestamp": "2026-04-22 14:20:00"}
    ];
}

function calculatePriority(notification) {
    const typeWeights = {
        "Placement": 3000000, // Base weight
        "Result": 2000000,
        "Event": 1000000
    };
    
    const notifType = notification.Type || "Event";
    const baseWeight = typeWeights[notifType] || 0;
    
    let recency = 0;
    if (notification.Timestamp) {
        // e.g. "2026-04-22 17:50:54"
        // Replace space with T to make it a valid ISO string format
        const isoString = notification.Timestamp.replace(' ', 'T') + "Z";
        recency = Math.floor(new Date(isoString).getTime() / 1000) || 0;
    }
        
    return baseWeight + recency;
}

async function main() {
    let notifications = [];
    try {
        notifications = await fetchNotifications();
    } catch (e) {
        console.log(`Failed to fetch from API: ${e.message}`);
        console.log("Using mock data based on prompt context...");
        notifications = getMockNotifications();
    }
    
    if (!notifications || notifications.length === 0) {
        console.log("No notifications found.");
        return;
    }
    
    // Filter for unread (assume all are unread if isRead not present)
    const unreadNotifications = notifications.filter(n => n.isRead === undefined || n.isRead === false);
    
    // Sort by priority descending
    unreadNotifications.sort((a, b) => calculatePriority(b) - calculatePriority(a));
    
    // Get Top 10
    const top10 = unreadNotifications.slice(0, 10);
    
    console.log(JSON.stringify(top10, null, 2));
}

main();
