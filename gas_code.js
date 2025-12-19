function doGet() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('State');
    // Assume JSON state is stored in cell A1 of 'State' sheet
    // If undefined, return empty object
    if (!sheet) return ContentService.createTextOutput("{}").setMimeType(ContentService.MimeType.JSON);

    const data = sheet.getRange("A1").getValue();
    return ContentService.createTextOutput(data || "{}").setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    try {
        const json = JSON.parse(e.postData.contents);

        // --- Case 1: Image Upload ---
        if (json.action === 'upload') {
            return handleImageUpload(json);
        }

        // --- Case 2: Save State (Default) ---
        // If it's a normal save, we receive the entire 'state' object

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName('State');
        if (!sheet) {
            sheet = ss.insertSheet('State');
        }

        // Store the entire JSON dump in A1 for simplicity and reliability
        sheet.getRange("A1").setValue(JSON.stringify(json));

        return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function handleImageUpload(data) {
    // CONFIGURATION: Enter your Google Drive Folder ID here
    // ID is the part after 'folders/' in the URL
    const FOLDER_ID = "1DrKrh7RGo9K66DeQ79zpdkCcszZ_yzPH";

    try {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData), data.mimeType, data.fileName);
        const file = folder.createFile(blob);

        // Set permission to "Anyone with the link can VIEW"
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        // Generate Direct View URL
        // uc?export=view&id=... allows direct use in <img> tags
        const fileUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();

        // Optional: Log upload to a "Uploads" sheet if desired
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let logSheet = ss.getSheetByName('UploadLogs');
        if (!logSheet) {
            logSheet = ss.insertSheet('UploadLogs');
            logSheet.appendRow(["TimeStamp", "FileName", "URL"]);
        }
        logSheet.appendRow([new Date(), data.fileName, fileUrl]);

        return ContentService.createTextOutput(JSON.stringify({ url: fileUrl }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Upload Failed: " + err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// --- Helper for Authorization ---
// Run this function once in the editor to trigger Write permissions
function forceAuth() {
    DriveApp.createFile("temp_auth_trigger.txt", "This file is for triggering permissions.");
    Logger.log("Authorization success! You can delete the temp file in Drive.");
}
