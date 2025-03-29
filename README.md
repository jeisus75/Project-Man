# Construction Site Dashboard

A lightweight, real-time project management dashboard for construction sites that pulls data from Google Sheets, allows updates via messaging apps (Telegram), and displays information visually for field teams.

## Features

- **Real-time progress tracking** with traffic light indicators
- **Site photo gallery** stored in Telegram/Google Drive
- **Equipment location tracking** with QR code system
- **Offline capability** via Service Workers
- **Mobile-friendly PWA** installable on Android devices
- **Near-zero runtime costs** using Google Sheets as a database

## Architecture

### Frontend
- Single HTML page using vanilla JavaScript and CSS (no frameworks)
- Responsive design that works on mobile devices
- Progressive Web App (PWA) for offline capability

### Backend
- Google Apps Script acting as middleware
- Google Sheets as the data store
- Telegram bot for field updates

### Data Flow
```
Telegram -> Google Apps Script -> Google Sheets -> Dashboard
```

## Setup Instructions

### 1. Google Sheets Setup

1. Create a new Google Sheets document
2. Create the following sheets:
   - **Sites**: Information about construction sites
   - **Progress**: Progress updates for each site
   - **Equipment**: Equipment tracking information
   - **Issues**: Issues reported for each site
   - **Photos**: Photo metadata for each site

3. Set up the columns for each sheet:

#### Sites Sheet
| ID | Name | Location | Manager | Start Date | Target Date | Status |
|----|------|----------|---------|------------|-------------|--------|
| 1  | Site A | 60.1699,24.9384 | John Smith | 2025-01-15 | 2025-06-30 | active |

#### Progress Sheet
| Timestamp | Site ID | Percentage | Notes | Reported By |
|-----------|---------|------------|-------|-------------|
| 2025-03-28T12:00:00Z | 1 | 65 | North wall completed | John Smith |

#### Equipment Sheet
| ID | Name | Type | Current Site | Status | Last Updated | QR Code |
|----|------|------|-------------|--------|--------------|---------|
| E001 | Crane | heavy | 1 | available | 2025-03-28T12:00:00Z | https://example.com/qr/E001 |

#### Issues Sheet
| Timestamp | Site ID | Description | Severity | Status | Reported By |
|-----------|---------|-------------|----------|--------|-------------|
| 2025-03-28T12:00:00Z | 1 | Water leak in basement | high | open | Sarah Johnson |

#### Photos Sheet
| Timestamp | Site ID | URL | Caption | Taken By |
|-----------|---------|-----|---------|----------|
| 2025-03-28T12:00:00Z | 1 | https://example.com/photos/123.jpg | North wall progress | Mike Brown |

### 2. Google Apps Script Setup

1. Open your Google Sheets document
2. Click on Extensions > Apps Script
3. Copy the contents of `scripts/google-apps-script.js` into the script editor
4. Replace `YOUR_SPREADSHEET_ID` with your actual spreadsheet ID (found in the URL of your Google Sheets document)
5. Deploy the script as a web app:
   - Click on Deploy > New deployment
   - Select type: Web app
   - Execute as: Me (your account)
   - Who has access: Anyone (anonymous)
   - Click Deploy
6. Copy the web app URL for later use

### 3. Telegram Bot Setup

1. Open Telegram and search for @BotFather
2. Create a new bot with the command `/newbot`
3. Follow the instructions to set a name and username for your bot
4. Copy the bot token provided by BotFather
5. Update the `TELEGRAM_BOT_TOKEN` in the Google Apps Script with your bot token
6. Set the webhook URL for your bot:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_GOOGLE_APPS_SCRIPT_URL>
   ```

### 4. Dashboard Setup

1. Clone this repository
2. Update the `CONFIG.api.sheetsEndpoint` in `assets/js/config.js` with your Google Apps Script web app URL
3. Generate QR codes for your equipment and update the QR Code URLs in the Equipment sheet
4. Deploy the dashboard to a web server or use GitHub Pages

### 5. PWA Setup

1. Generate icons for your PWA using a tool like [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
2. Place the icons in the `assets/img` directory
3. Update the `manifest.json` file with your app information
4. Deploy the dashboard to a secure (HTTPS) web server

## Usage

### Dashboard

1. Open the dashboard in a web browser
2. Select a site from the dropdown to view its details
3. Use the refresh button to update the data
4. Click on the floating action button (+) to access quick actions

### Telegram Bot

Use the following commands with the Telegram bot:

- `/progress [site] [%]` - Update site completion percentage
- `/photo [site]` - Upload a site photo (send the command followed by a photo)
- `/where [equipment] [site]` - Report equipment location
- `/issue [site] [description]` - Report an issue
- `/sites` - List all available sites
- `/help` - Show available commands

## Offline Capability

The dashboard works offline with the following limitations:

1. Data is cached for offline viewing
2. Updates made while offline are queued and sent when back online
3. Photos taken while offline are stored locally and uploaded when back online

## Development

### Project Structure

```
construction-site-dashboard/
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── img/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── telegram-qr.png
│   └── js/
│       ├── api.js
│       ├── app.js
│       ├── config.js
│       ├── map.js
│       ├── storage.js
│       └── ui.js
├── scripts/
│   └── google-apps-script.js
├── index.html
├── manifest.json
├── service-worker.js
└── README.md
```

### Local Development

1. Use a local web server to serve the files:
   ```
   npx http-server
   ```
2. Open `http://localhost:8080` in your browser

## License

MIT License

## Credits

- [Leaflet.js](https://leafletjs.com/) for maps
- [Chart.js](https://www.chartjs.org/) for charts
- [Bootstrap](https://getbootstrap.com/) for UI components
- [Font Awesome](https://fontawesome.com/) for icons