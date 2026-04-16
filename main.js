// Core specific data for traditional significance
const PRAHAR_CONFIG = {
    day: [
        { name: "Prathama (1st)", bengali: "১ম প্রহর", significance: "Morning. Start of daily labor, agriculture, and morning prayers.", color: "#FFA751" },
        { name: "Dwitiya (2nd)", bengali: "২য় প্রহর", significance: "Mid-morning to Noon. Peak activity, work, and productivity.", color: "#FFCE00" },
        { name: "Tritiya (3rd)", bengali: "৩য় প্রহর", significance: "Afternoon. Post-lunch period, slow transition to rest.", color: "#E67E22" },
        { name: "Chaturtha (4th)", bengali: "৪র্থ প্রহর", significance: "Late afternoon to Dusk. Winding down, evening preparations.", color: "#D35400" }
    ],
    night: [
        { name: "Prathama (1st)", bengali: "১ম প্রহর", significance: "Evening. Family time, evening meals, and relaxation.", color: "#2B4162" },
        { name: "Dwitiya (2nd)", bengali: "২য় প্রহর", significance: "Late evening. The sleep cycle begins.", color: "#1F314F" },
        { name: "Tritiya (3rd)", bengali: "৩য় প্রহর", significance: "Midnight. Deep night, profound rest.", color: "#121E36" },
        { name: "Chaturtha (4th)", bengali: "৪র্থ প্রহর", significance: "Pre-dawn (Brahma Muhurta). Spiritual practices, awakening.", color: "#0B132B" }
    ]
};

// Global State
let lat = 22.5726; // Default to Kolkata
let lng = 88.3639;
let prahars = [];
let activePraharIndex = -1;

// Math / Geometry Helpers
function timeToDisplayAngle(date) {
    const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
    return ((hours / 24) * 360 + 180) % 360;
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function describeArc(x, y, radius, startAngle, endAngle) {
    if (Math.abs(endAngle - startAngle) >= 360) endAngle -= 0.01;
    
    let drawEnd = endAngle;
    if (drawEnd <= startAngle) drawEnd += 360;

    const start = polarToCartesian(x, y, radius, startAngle);
    const end = polarToCartesian(x, y, radius, drawEnd);
    const largeArcFlag = drawEnd - startAngle <= 180 ? "0" : "1";

    return [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
    ].join(" ");
}

// Formatters
function formatTime(date) {
    let h = date.getHours();
    let m = date.getMinutes();
    let ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    m = m < 10 ? '0' + m : m;
    return `${h}:${m} ${ampm}`;
}

// Logic: Calculate Prahars dynamically
function calculatePrahars() {
    const now = new Date();
    // Default suncalc times for today
    const timesToday = SunCalc.getTimes(now, lat, lng);
    const timesTomorrow = SunCalc.getTimes(new Date(now.getTime() + 86400000), lat, lng);
    const timesYesterday = SunCalc.getTimes(new Date(now.getTime() - 86400000), lat, lng);

    let sunrise, sunset, nextSunrise;

    // Determine current "Cycle". 
    // Cycle goes from Sunrise to Tomorrow's Sunrise.
    if (now < timesToday.sunrise) {
        // It's past midnight but before today's sunrise. 
        // We belong to Yesterday's cycle!
        sunrise = timesYesterday.sunrise;
        sunset = timesYesterday.sunset;
        nextSunrise = timesToday.sunrise;
    } else {
        // Standard today cycle
        sunrise = timesToday.sunrise;
        sunset = timesToday.sunset;
        nextSunrise = timesTomorrow.sunrise;
    }

    const dayDuration = sunset.getTime() - sunrise.getTime(); // millis
    const nightDuration = nextSunrise.getTime() - sunset.getTime(); // millis

    const dayPraharLen = dayDuration / 4;
    const nightPraharLen = nightDuration / 4;

    const slices = [];

    // 4 Day Prahars
    for (let i = 0; i < 4; i++) {
        let start = new Date(sunrise.getTime() + i * dayPraharLen);
        let end = new Date(sunrise.getTime() + (i + 1) * dayPraharLen);
        slices.push({
            ...PRAHAR_CONFIG.day[i],
            type: 'Diba-Prahar (Day)',
            start, end,
            isDay: true
        });
    }

    // 4 Night Prahars
    for (let i = 0; i < 4; i++) {
        let start = new Date(sunset.getTime() + i * nightPraharLen);
        let end = new Date(sunset.getTime() + (i + 1) * nightPraharLen);
        slices.push({
            ...PRAHAR_CONFIG.night[i],
            type: 'Ratri-Prahar (Night)',
            start, end,
            isDay: false
        });
    }

    prahars = slices;
    
    // Update Solar Info UI
    document.getElementById('info-sunrise').textContent = formatTime(sunrise);
    document.getElementById('info-sunset').textContent = formatTime(sunset);
    
    renderSVG();
}


// UI Rendering
function renderSVG() {
    const svgSegments = document.getElementById('prahar-segments');
    const svgHourMarkers = document.getElementById('hour-markers');
    const svgSolarMarkers = document.getElementById('solar-markers');
    
    svgSegments.innerHTML = '';
    svgHourMarkers.innerHTML = '';
    svgSolarMarkers.innerHTML = '';

    const CENTER = 250;
    const RADIUS_MID = 170; // 110 inner, 230 outer => stroke width 120
    const STROKE_WIDTH = 120;

    // Draw 8 dynamic segments
    prahars.forEach((p, index) => {
        const startAng = timeToDisplayAngle(p.start);
        const endAng = timeToDisplayAngle(p.end);
        
        let pathStr = describeArc(CENTER, CENTER, RADIUS_MID, startAng, endAng);
        
        // Add slightly smaller stroke gap for aesthetics
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathStr);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", p.color);
        path.setAttribute("stroke-width", STROKE_WIDTH - 4);
        path.classList.add("prahar-segment");
        path.id = `prahar-seg-${index}`;

        // Tooltip logic via title or simple hover
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.innerHTML = `${p.bengali} - ${p.name}\n${formatTime(p.start)} to ${formatTime(p.end)}`;
        path.appendChild(title);
        
        svgSegments.appendChild(path);

        // Put Bengali text roughly in center of arc
        let midAng = startAng + (endAng > startAng ? endAng - startAng : endAng + 360 - startAng) / 2;
        let pos = polarToCartesian(CENTER, CENTER, RADIUS_MID, midAng);
        
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", pos.x);
        txt.setAttribute("y", pos.y);
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("alignment-baseline", "middle");
        txt.setAttribute("class", "segment-text");
        txt.textContent = p.bengali.split(" ")[0]; // Just the numeral part maybe? Actually let's do whole text
        svgSegments.appendChild(txt);
    });

    // Draw 24-Hour markers on Outer Ring (Radius = 240)
    for(let i=0; i<24; i++) {
        let hrAngle = ((i / 24) * 360 + 180) % 360;
        let pOuter = polarToCartesian(CENTER, CENTER, 240, hrAngle);
        let pInner = polarToCartesian(CENTER, CENTER, 230, hrAngle);
        
        const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
        tick.setAttribute("x1", pInner.x);
        tick.setAttribute("y1", pInner.y);
        tick.setAttribute("x2", pOuter.x);
        tick.setAttribute("y2", pOuter.y);
        tick.setAttribute("class", "hour-tick");
        svgHourMarkers.appendChild(tick);

        if(i % 2 === 0) { // Text every 2 hours
            let pText = polarToCartesian(CENTER, CENTER, 255, hrAngle);
            const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            txt.setAttribute("x", pText.x);
            txt.setAttribute("y", pText.y);
            txt.setAttribute("class", "hour-text");
            txt.textContent = i === 0 ? '24' : i;
            // rotate text to face center
            let rotate = hrAngle + 90;
            txt.setAttribute("transform", `rotate(${rotate}, ${pText.x}, ${pText.y})`);
            if (i > 6 && i < 18) {
                // Keep text upright at top half
                txt.setAttribute("transform", `rotate(${rotate - 180}, ${pText.x}, ${pText.y})`);
            }
            svgHourMarkers.appendChild(txt);
        }
    }
}

function updateClock() {
    const now = new Date();
    
    // Update SVG Text
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    document.getElementById('svg-time').textContent = `${h}:${m}:${s}`;
    
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    document.getElementById('svg-date').textContent = now.toLocaleDateString(undefined, options);

    // Update Needle position
    const needleAng = timeToDisplayAngle(now);
    document.getElementById('time-needle').setAttribute('transform', `rotate(${needleAng})`);

    // Determine Active Prahar
    let foundIndex = -1;
    for(let i=0; i<prahars.length; i++) {
        let p = prahars[i];
        if (now >= p.start && now < p.end) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex !== -1) {
        if (activePraharIndex !== foundIndex) {
            updateActiveCard(prahars[foundIndex], foundIndex);
            activePraharIndex = foundIndex;
            
            // Re-render SVG to stroke active class or let CSS handle it
            document.querySelectorAll('.prahar-segment').forEach(el => el.style.opacity = '0.5');
            document.getElementById(`prahar-seg-${foundIndex}`).style.opacity = '1';
        }
        
        // Update Progress
        const activeP = prahars[foundIndex];
        const totalP = activeP.end.getTime() - activeP.start.getTime();
        const elapsedP = now.getTime() - activeP.start.getTime();
        const percent = Math.max(0, Math.min(100, (elapsedP / totalP) * 100));
        
        document.getElementById('p-progress').style.width = `${percent}%`;
        document.getElementById('p-percentage').textContent = `${Math.floor(percent)}%`;

        // Update Background Theme Fluidly
        if (activeP.isDay) {
            document.documentElement.style.setProperty('--fluid-grad-1', '#FF9933');
            document.documentElement.style.setProperty('--fluid-grad-2', '#0A0A12');
            document.getElementById('p-bengali').style.color = 'var(--day-color)';
        } else {
            document.documentElement.style.setProperty('--fluid-grad-1', '#0B132B');
            document.documentElement.style.setProperty('--fluid-grad-2', '#0A0A12');
            document.getElementById('p-bengali').style.color = '#7d9be6';
        }
    }
}

function updateActiveCard(p, index) {
    document.getElementById('p-bengali').textContent = p.bengali;
    document.getElementById('p-name').textContent = p.name;
    document.getElementById('p-type').textContent = p.type;
    document.getElementById('p-start').textContent = formatTime(p.start);
    document.getElementById('p-end').textContent = formatTime(p.end);
    document.getElementById('p-significance').textContent = p.significance;
}

// Initialization and Geolocation
function init() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            lat = position.coords.latitude;
            lng = position.coords.longitude;
            document.getElementById('location-status').innerHTML = "📍 Using Your Current Location";
            calculatePrahars();
            updateClock();
        }, (error) => {
            console.warn("Geolocation denied or failed. Fallback to Kolkata.", error);
            calculatePrahars();
            updateClock();
        });
    } else {
        calculatePrahars();
        updateClock();
    }

    // Refresh Prahar divisions every minute just in case of midnight crossing
    setInterval(calculatePrahars, 60000 * 60); 

    // Tick clock every second
    setInterval(updateClock, 1000);
}

// Run!
init();
