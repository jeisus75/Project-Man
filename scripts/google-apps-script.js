/**
 * Construction Site Dashboard
 * Google Apps Script - Middleware for Google Sheets and Telegram Bot
 * 
 * This script should be deployed as a web app with the following settings:
 * - Execute as: Me (your account)
 * - Who has access: Anyone (anonymous)
 */

// Spreadsheet ID - replace with your actual spreadsheet ID
const SPREADSHEET_ID = 'AKfycbyduKCII53kglAFMJDD_6X-k2sj57dBZcpPP6amj3ibRATflzr15O8KAJfIEb865C5_';

// Telegram Bot Token - replace with your actual bot token
const TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';

// Telegram API URL
const TELEGRAM_API_URL = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN;

// Sheet names
const SHEETS = {
  SITES: 'Sites',
  PROGRESS: 'Progress',
  EQUIPMENT: 'Equipment',
  ISSUES: 'Issues',
  PHOTOS: 'Photos'
};

// Column mappings
const COLUMNS = {
  SITES: {
    ID: 0,
    NAME: 1,
    LOCATION: 2,
    MANAGER: 3,
    START_DATE: 4,
    TARGET_DATE: 5,
    STATUS: 6
  },
  PROGRESS: {
    TIMESTAMP: 0,
    SITE_ID: 1,
    PERCENTAGE: 2,
    NOTES: 3,
    REPORTED_BY: 4
  },
  EQUIPMENT: {
    ID: 0,
    NAME: 1,
    TYPE: 2,
    CURRENT_SITE: 3,
    STATUS: 4,
    LAST_UPDATED: 5,
    QR_CODE: 6
  },
  ISSUES: {
    TIMESTAMP: 0,
    SITE_ID: 1,
    DESCRIPTION: 2,
    SEVERITY: 3,
    STATUS: 4,
    REPORTED_BY: 5
  },
  PHOTOS: {
    TIMESTAMP: 0,
    SITE_ID: 1,
    URL: 2,
    CAPTION: 3,
    TAKEN_BY: 4
  }
};

/**
 * Handle GET requests
 * @param {Object} e - Event object
 * @returns {TextOutput} - JSON response
 */
function doGet(e) {
  try {
    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    
    // Parse parameters
    const params = e.parameter;
    const action = params.action || 'get';
    const sheet = params.sheet || 'sites';
    
    // Handle action
    let result;
    
    if (action === 'get') {
      result = handleGetAction(sheet, params);
    } else {
      result = { error: 'Invalid action' };
    }
    
    // Return response
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
  } catch (error) {
    // Log error
    console.error('Error in doGet:', error);
    
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests
 * @param {Object} e - Event object
 * @returns {TextOutput} - JSON response
 */
function doPost(e) {
  try {
    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    
    // Check if this is a Telegram webhook
    if (e.postData && e.postData.type === 'application/json') {
      const update = JSON.parse(e.postData.contents);
      
      // Check if this is a Telegram update
      if (update.message) {
        // Handle Telegram message
        handleTelegramMessage(update.message);
        
        // Return success response
        return ContentService.createTextOutput(JSON.stringify({
          success: true
        }))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeaders(headers);
      }
    }
    
    // Parse parameters
    let params;
    
    if (e.postData && e.postData.type === 'application/json') {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      params = e.parameter;
    } else {
      throw new Error('Invalid request');
    }
    
    const action = params.action || 'update';
    const sheet = params.sheet || 'progress';
    const data = params.data || {};
    
    // Handle action
    let result;
    
    if (action === 'update') {
      result = handleUpdateAction(sheet, data);
    } else if (action === 'uploadPhoto') {
      result = handlePhotoUpload(e);
    } else {
      result = { error: 'Invalid action' };
    }
    
    // Return response
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
  } catch (error) {
    // Log error
    console.error('Error in doPost:', error);
    
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle OPTIONS requests (for CORS)
 * @returns {TextOutput} - Empty response with CORS headers
 */
function doOptions() {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  // Return empty response with headers
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}

/**
 * Handle GET action
 * @param {string} sheetName - Sheet name
 * @param {Object} params - Additional parameters
 * @returns {Object} - Response data
 */
function handleGetAction(sheetName, params) {
  // Get spreadsheet
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get sheet
  let sheet;
  
  switch (sheetName.toLowerCase()) {
    case 'sites':
      sheet = spreadsheet.getSheetByName(SHEETS.SITES);
      break;
    case 'progress':
      sheet = spreadsheet.getSheetByName(SHEETS.PROGRESS);
      break;
    case 'equipment':
      sheet = spreadsheet.getSheetByName(SHEETS.EQUIPMENT);
      break;
    case 'issues':
      sheet = spreadsheet.getSheetByName(SHEETS.ISSUES);
      break;
    case 'photos':
      sheet = spreadsheet.getSheetByName(SHEETS.PHOTOS);
      break;
    default:
      throw new Error('Invalid sheet name');
  }
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  // Get data range
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Skip header row
  const data = values.slice(1);
  
  // Convert to objects based on sheet type
  let result;
  
  switch (sheetName.toLowerCase()) {
    case 'sites':
      result = data.map(row => ({
        id: row[COLUMNS.SITES.ID].toString(),
        name: row[COLUMNS.SITES.NAME],
        location: row[COLUMNS.SITES.LOCATION],
        manager: row[COLUMNS.SITES.MANAGER],
        startDate: formatDate(row[COLUMNS.SITES.START_DATE]),
        targetDate: formatDate(row[COLUMNS.SITES.TARGET_DATE]),
        status: row[COLUMNS.SITES.STATUS]
      }));
      break;
    case 'progress':
      result = data.map((row, index) => ({
        id: index.toString(),
        timestamp: formatDate(row[COLUMNS.PROGRESS.TIMESTAMP]),
        siteId: row[COLUMNS.PROGRESS.SITE_ID].toString(),
        percentage: parseInt(row[COLUMNS.PROGRESS.PERCENTAGE], 10),
        notes: row[COLUMNS.PROGRESS.NOTES],
        reportedBy: row[COLUMNS.PROGRESS.REPORTED_BY]
      }));
      break;
    case 'equipment':
      result = data.map(row => ({
        id: row[COLUMNS.EQUIPMENT.ID].toString(),
        name: row[COLUMNS.EQUIPMENT.NAME],
        type: row[COLUMNS.EQUIPMENT.TYPE],
        currentSite: row[COLUMNS.EQUIPMENT.CURRENT_SITE].toString(),
        status: row[COLUMNS.EQUIPMENT.STATUS],
        lastUpdated: formatDate(row[COLUMNS.EQUIPMENT.LAST_UPDATED]),
        qrCode: row[COLUMNS.EQUIPMENT.QR_CODE]
      }));
      break;
    case 'issues':
      result = data.map((row, index) => ({
        id: index.toString(),
        timestamp: formatDate(row[COLUMNS.ISSUES.TIMESTAMP]),
        siteId: row[COLUMNS.ISSUES.SITE_ID].toString(),
        description: row[COLUMNS.ISSUES.DESCRIPTION],
        severity: row[COLUMNS.ISSUES.SEVERITY],
        status: row[COLUMNS.ISSUES.STATUS],
        reportedBy: row[COLUMNS.ISSUES.REPORTED_BY]
      }));
      break;
    case 'photos':
      result = data.map((row, index) => ({
        id: index.toString(),
        timestamp: formatDate(row[COLUMNS.PHOTOS.TIMESTAMP]),
        siteId: row[COLUMNS.PHOTOS.SITE_ID].toString(),
        url: row[COLUMNS.PHOTOS.URL],
        caption: row[COLUMNS.PHOTOS.CAPTION],
        takenBy: row[COLUMNS.PHOTOS.TAKEN_BY]
      }));
      break;
    default:
      result = [];
  }
  
  // Filter by site ID if provided
  if (params.siteId) {
    result = result.filter(item => item.siteId === params.siteId);
  }
  
  return result;
}

/**
 * Handle UPDATE action
 * @param {string} sheetName - Sheet name
 * @param {Object} data - Data to update
 * @returns {Object} - Response data
 */
function handleUpdateAction(sheetName, data) {
  // Get spreadsheet
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get sheet
  let sheet;
  
  switch (sheetName.toLowerCase()) {
    case 'progress':
      sheet = spreadsheet.getSheetByName(SHEETS.PROGRESS);
      break;
    case 'equipment':
      sheet = spreadsheet.getSheetByName(SHEETS.EQUIPMENT);
      break;
    case 'issues':
      sheet = spreadsheet.getSheetByName(SHEETS.ISSUES);
      break;
    case 'photos':
      sheet = spreadsheet.getSheetByName(SHEETS.PHOTOS);
      break;
    default:
      throw new Error('Invalid sheet name');
  }
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  // Prepare row data
  let rowData;
  
  switch (sheetName.toLowerCase()) {
    case 'progress':
      rowData = [
        new Date(),
        data.siteId,
        data.percentage,
        data.notes || '',
        data.reportedBy || 'Dashboard User'
      ];
      break;
    case 'equipment':
      rowData = [
        data.id,
        data.name,
        data.type,
        data.currentSite,
        data.status,
        new Date(),
        data.qrCode || ''
      ];
      break;
    case 'issues':
      rowData = [
        new Date(),
        data.siteId,
        data.description,
        data.severity || 'medium',
        data.status || 'open',
        data.reportedBy || 'Dashboard User'
      ];
      break;
    case 'photos':
      rowData = [
        new Date(),
        data.siteId,
        data.url,
        data.caption || '',
        data.takenBy || 'Dashboard User'
      ];
      break;
    default:
      throw new Error('Invalid sheet name');
  }
  
  // Add row to sheet
  sheet.appendRow(rowData);
  
  // Return success response
  return {
    success: true,
    message: 'Data updated successfully'
  };
}

/**
 * Handle photo upload
 * @param {Object} e - Event object
 * @returns {Object} - Response data
 */
function handlePhotoUpload(e) {
  // In a real implementation, this would handle file uploads
  // For this example, we'll just simulate a successful upload
  
  // Get parameters
  const params = e.parameter;
  const siteId = params.siteId;
  const caption = params.caption || '';
  
  // Generate a fake URL for the photo
  const photoUrl = 'https://example.com/photos/' + Math.random().toString(36).substring(2, 15) + '.jpg';
  
  // Add photo to sheet
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEETS.PHOTOS);
  
  sheet.appendRow([
    new Date(),
    siteId,
    photoUrl,
    caption,
    'Dashboard User'
  ]);
  
  // Return success response
  return {
    success: true,
    message: 'Photo uploaded successfully',
    url: photoUrl
  };
}

/**
 * Handle Telegram message
 * @param {Object} message - Telegram message object
 */
function handleTelegramMessage(message) {
  // Get chat ID and text
  const chatId = message.chat.id;
  const text = message.text;
  
  // Check if message is a command
  if (text && text.startsWith('/')) {
    // Split command and arguments
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Handle commands
    switch (command) {
      case '/start':
        sendTelegramMessage(chatId, 'Welcome to the Construction Site Dashboard Bot! Use /help to see available commands.');
        break;
      case '/help':
        sendTelegramMessage(chatId, 'Available commands:\n\n' +
          '/progress [site] [%] - Update site completion\n' +
          '/photo [site] - Upload a site photo\n' +
          '/where [equipment] - Report equipment location\n' +
          '/issue [site] [description] - Report an issue\n' +
          '/sites - List all sites\n' +
          '/help - Show this help message');
        break;
      case '/progress':
        handleProgressCommand(chatId, args, message.from);
        break;
      case '/photo':
        handlePhotoCommand(chatId, args, message);
        break;
      case '/where':
        handleWhereCommand(chatId, args, message.from);
        break;
      case '/issue':
        handleIssueCommand(chatId, args, message.from);
        break;
      case '/sites':
        handleSitesCommand(chatId);
        break;
      default:
        sendTelegramMessage(chatId, 'Unknown command. Use /help to see available commands.');
    }
  } else if (message.photo) {
    // Handle photo message
    handlePhotoMessage(chatId, message);
  } else {
    // Handle regular message
    sendTelegramMessage(chatId, 'Send a command to interact with the dashboard. Use /help to see available commands.');
  }
}

/**
 * Handle /progress command
 * @param {number} chatId - Telegram chat ID
 * @param {Array} args - Command arguments
 * @param {Object} user - Telegram user
 */
function handleProgressCommand(chatId, args, user) {
  // Check arguments
  if (args.length < 2) {
    sendTelegramMessage(chatId, 'Usage: /progress [site] [%]\nExample: /progress 1 75');
    return;
  }
  
  const siteId = args[0];
  const percentage = parseInt(args[1], 10);
  const notes = args.slice(2).join(' ');
  
  // Validate site ID
  const site = getSiteById(siteId);
  
  if (!site) {
    sendTelegramMessage(chatId, `Site with ID ${siteId} not found. Use /sites to see all sites.`);
    return;
  }
  
  // Validate percentage
  if (isNaN(percentage) || percentage < 0 || percentage > 100) {
    sendTelegramMessage(chatId, 'Percentage must be a number between 0 and 100.');
    return;
  }
  
  // Update progress
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEETS.PROGRESS);
  
  sheet.appendRow([
    new Date(),
    siteId,
    percentage,
    notes,
    `${user.first_name} ${user.last_name || ''} (Telegram)`
  ]);
  
  // Send confirmation
  sendTelegramMessage(chatId, `Progress for ${site.name} updated to ${percentage}%.`);
}

/**
 * Handle /photo command
 * @param {number} chatId - Telegram chat ID
 * @param {Array} args - Command arguments
 * @param {Object} message - Telegram message
 */
function handlePhotoCommand(chatId, args, message) {
  // Check arguments
  if (args.length < 1) {
    sendTelegramMessage(chatId, 'Usage: /photo [site] [caption]\nExample: /photo 1 North wall progress');
    return;
  }
  
  const siteId = args[0];
  const caption = args.slice(1).join(' ');
  
  // Validate site ID
  const site = getSiteById(siteId);
  
  if (!site) {
    sendTelegramMessage(chatId, `Site with ID ${siteId} not found. Use /sites to see all sites.`);
    return;
  }
  
  // Check if message has a photo
  if (message.photo) {
    // Get the largest photo
    const photo = message.photo[message.photo.length - 1];
    
    // Get file info
    const fileInfo = getFileInfo(photo.file_id);
    
    if (fileInfo && fileInfo.file_path) {
      // Get file URL
      const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
      
      // Add photo to sheet
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(SHEETS.PHOTOS);
      
      sheet.appendRow([
        new Date(),
        siteId,
        fileUrl,
        caption,
        `${message.from.first_name} ${message.from.last_name || ''} (Telegram)`
      ]);
      
      // Send confirmation
      sendTelegramMessage(chatId, `Photo for ${site.name} uploaded successfully.`);
    } else {
      sendTelegramMessage(chatId, 'Error uploading photo. Please try again.');
    }
  } else {
    sendTelegramMessage(chatId, 'Please send a photo with the /photo command or send the command first and then the photo.');
  }
}

/**
 * Handle photo message
 * @param {number} chatId - Telegram chat ID
 * @param {Object} message - Telegram message
 */
function handlePhotoMessage(chatId, message) {
  // Check if we have a pending photo command
  // In a real implementation, this would check a database or cache
  // For this example, we'll just ask the user to use the /photo command
  
  sendTelegramMessage(chatId, 'Please use the /photo command to upload a photo.\nExample: /photo 1 North wall progress');
}

/**
 * Handle /where command
 * @param {number} chatId - Telegram chat ID
 * @param {Array} args - Command arguments
 * @param {Object} user - Telegram user
 */
function handleWhereCommand(chatId, args, user) {
  // Check arguments
  if (args.length < 2) {
    sendTelegramMessage(chatId, 'Usage: /where [equipment] [site]\nExample: /where crane 2');
    return;
  }
  
  const equipmentId = args[0];
  const siteId = args[1];
  
  // Validate equipment ID
  const equipment = getEquipmentById(equipmentId);
  
  if (!equipment) {
    sendTelegramMessage(chatId, `Equipment with ID ${equipmentId} not found.`);
    return;
  }
  
  // Validate site ID
  const site = getSiteById(siteId);
  
  if (!site) {
    sendTelegramMessage(chatId, `Site with ID ${siteId} not found. Use /sites to see all sites.`);
    return;
  }
  
  // Update equipment location
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEETS.EQUIPMENT);
  
  // Find equipment row
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][COLUMNS.EQUIPMENT.ID].toString() === equipmentId) {
      // Update row
      sheet.getRange(i + 1, COLUMNS.EQUIPMENT.CURRENT_SITE + 1).setValue(siteId);
      sheet.getRange(i + 1, COLUMNS.EQUIPMENT.LAST_UPDATED + 1).setValue(new Date());
      
      // Send confirmation
      sendTelegramMessage(chatId, `${equipment.name} location updated to ${site.name}.`);
      return;
    }
  }
  
  sendTelegramMessage(chatId, 'Error updating equipment location. Please try again.');
}

/**
 * Handle /issue command
 * @param {number} chatId - Telegram chat ID
 * @param {Array} args - Command arguments
 * @param {Object} user - Telegram user
 */
function handleIssueCommand(chatId, args, user) {
  // Check arguments
  if (args.length < 2) {
    sendTelegramMessage(chatId, 'Usage: /issue [site] [description]\nExample: /issue 1 Water leak in basement');
    return;
  }
  
  const siteId = args[0];
  const description = args.slice(1).join(' ');
  
  // Validate site ID
  const site = getSiteById(siteId);
  
  if (!site) {
    sendTelegramMessage(chatId, `Site with ID ${siteId} not found. Use /sites to see all sites.`);
    return;
  }
  
  // Add issue
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEETS.ISSUES);
  
  sheet.appendRow([
    new Date(),
    siteId,
    description,
    'medium',
    'open',
    `${user.first_name} ${user.last_name || ''} (Telegram)`
  ]);
  
  // Send confirmation
  sendTelegramMessage(chatId, `Issue for ${site.name} reported successfully.`);
}

/**
 * Handle /sites command
 * @param {number} chatId - Telegram chat ID
 */
function handleSitesCommand(chatId) {
  // Get sites
  const sites = getAllSites();
  
  if (sites.length === 0) {
    sendTelegramMessage(chatId, 'No sites found.');
    return;
  }
  
  // Format sites list
  let message = 'Available sites:\n\n';
  
  sites.forEach(site => {
    message += `ID: ${site.id} - ${site.name}\n`;
  });
  
  // Send message
  sendTelegramMessage(chatId, message);
}

/**
 * Send message to Telegram chat
 * @param {number} chatId - Telegram chat ID
 * @param {string} text - Message text
 * @returns {Object} - Response data
 */
function sendTelegramMessage(chatId, text) {
  const url = `${TELEGRAM_API_URL}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText());
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return { error: error.message };
  }
}

/**
 * Get file info from Telegram
 * @param {string} fileId - Telegram file ID
 * @returns {Object} - File info
 */
function getFileInfo(fileId) {
  const url = `${TELEGRAM_API_URL}/getFile?file_id=${fileId}`;
  
  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    if (data.ok) {
      return data.result;
    } else {
      console.error('Error getting file info:', data);
      return null;
    }
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
}

/**
 * Get site by ID
 * @param {string} siteId - Site ID
 * @returns {Object|null} - Site object or null if not found
 */
function getSiteById(siteId) {
  const sites = getAllSites();
  return sites.find(site => site.id === siteId) || null;
}

/**
 * Get all sites
 * @returns {Array} - Array of site objects
 */
function getAllSites() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEETS.SITES);
  
  if (!sheet) {
    return [];
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Skip header row
  const data = values.slice(1);
  
  return data.map(row => ({
    id: row[COLUMNS.SITES.ID].toString(),
    name: row[COLUMNS.SITES.NAME],
    location: row[COLUMNS.SITES.LOCATION],
    manager: row[COLUMNS.SITES.MANAGER],
    startDate: formatDate(row[COLUMNS.SITES.START_DATE]),
    targetDate: formatDate(row[COLUMNS.SITES.TARGET_DATE]),
    status: row[COLUMNS.SITES.STATUS]
  }));
}

/**
 * Get equipment by ID
 * @param {string} equipmentId - Equipment ID
 * @returns {Object|null} - Equipment object or null if not found
 */
function getEquipmentById(equipmentId) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEETS.EQUIPMENT);
  
  if (!sheet) {
    return null;
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Skip header row
  for (let i = 1; i < values.length; i++) {
    if (values[i][COLUMNS.EQUIPMENT.ID].toString() === equipmentId) {
      return {
        id: values[i][COLUMNS.EQUIPMENT.ID].toString(),
        name: values[i][COLUMNS.EQUIPMENT.NAME],
        type: values[i][COLUMNS.EQUIPMENT.TYPE],
        currentSite: values[i][COLUMNS.EQUIPMENT.CURRENT_SITE].toString(),
        status: values[i][COLUMNS.EQUIPMENT.STATUS],
        lastUpdated: formatDate(values[i][COLUMNS.EQUIPMENT.LAST_UPDATED]),
        qrCode: values[i][COLUMNS.EQUIPMENT.QR_CODE]
      };
    }
  }
  
  return null;
}

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  if (!date) {
    return '';
  }
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  
  return date.toISOString();
}