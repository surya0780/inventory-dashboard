function doGet() {

  return ContentService
    .createTextOutput(
      JSON.stringify(getInventoryData())
    )
    .setMimeType(ContentService.MimeType.JSON);

}

function getInventoryData() {

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("DATA");

  const lastRow = sheet.getLastRow();

  if(lastRow < 2){
    return [];
  }

  const data = sheet
    .getRange(2,1,lastRow-1,8)
    .getValues();

  return data.map(r => ({

    item_id : r[0],
    product_name : r[1],
    brand : r[2],
    upc : String(r[3]),
    mrp : r[4],
    threshold : r[5],
    uom : r[6],
    qty : r[7]

  }));

}
