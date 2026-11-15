const { random, gaussian, clamp } = require('../utils/helpers');

function simulateGame(homeTeamId, awayTeamId, year) {
    const db = require('../database/db');
    
    // 1. Get team overall ratings (simplified version: average of Top 11 players)
    const getTeamStrength = (teamId) => {
        const players = db.prepare(`
            SELECT overall FROM players 
            WHERE team_id = ? AND injury_weeks = 0 
            ORDER BY overall DESC LIMIT 11
        `).all(teamId);
        if (players.length === 0) return 50;
        return players.reduce((sum, p) => sum + p.overall, 0) / players.length;
    };

    const homeStr = getTeamStrength(homeTeamId) + 2.5; // Home field advantage
    const awayStr = getTeamStrength(awayTeamId);

    // 2. Simulate scoring (simplified drive logic)
    const simScore = (offStr, defStr) => {
        let score = 0;
        for (let i = 0; i < 10; i++) { // 10 drives
            const advantage = offStr - defStr;
            const yards = clamp(Math.round(30 + advantage * 1.5 + gaussian(0, 15)), 0, 99);
            if (yards > 70) score += 7;
            else if (yards > 40) score += (Math.random() > 0.4 ? 3 : 0);
            else if (yards > 25) score += (Math.random() > 0.7 ? 3 : 0);
        }
        return score;
    };

    let homeScore = simScore(homeStr, awayStr);
    let awayScore = simScore(awayStr, homeStr);

    // Overtime
    if (homeScore === awayScore) {
        if (Math.random() > 0.5) homeScore += 3;
        else awayScore += 3;
    }

    return { homeScore, awayScore };
}

module.exports = { simulateGame };