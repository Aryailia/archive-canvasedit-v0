// include window.js

//var tool;
var CanvasEditApplication = new CustomGUI('GUI');
var CanvasEdit_ToolDatabase = new ToolDatabase();

$(document).ready(function() {
  var ui = CanvasEditApplication;
  document.getElementById('application').appendChild(ui.get);
  var AW =  ui.addWindow(100, 100, 300, 300, 'grey');
  AW.attachToWorkspace(CanvasEdit);
  var AWc = AW.content;
  
  AWc.addLayer();
  AWc.addLayer();
  AWc.addLayer();
  AWc.addLayer();
  AWc.addLayer();
  AWc.addLayer();
  AWc.addLayer();
  AWc.drawTestShape(0, 30, 30, 'red');
  AWc.drawTestShape(1, 50, 40, 'green');
  AWc.drawTestShape(2, 70, 50, 'orange');
  AWc.drawTestShape(3, 90, 60, 'silver');
  AWc.drawTestShape(4, 110, 70, 'blue');
  AWc.drawTestShape(5, 130, 80, 'teal');
  AWc.drawTestShape(6, 150, 90, 'purple');
  AWc.drawTestShape(7, 170, 100, 'black');
  AWc.update();

// TODO: check addLayer, defined index case
  //var test1 = AWc.addFolder(AWc.nodes, 8, 'New Folder 1');
  //AWc.nodes.children[6].move(test1, 0);
  //AWc.nodes.children[6].move(test1, 0);
  //test1.move(AWc.nodes, 5);
  //AWc.test2();
  
  
  
  var layerselect = ui.addWindow(450, 30, 300, 300, 'white');
  layerselect.attachToWorkspace(LayerSelect, AWc);
  
  var colorwheel = ui.addWindow(770, 100, 200, 200, 'white');
  colorwheel.attachToWorkspace(ColorWheel);
  
  
  var toolbox = new CanvasEdit_ToolInterface(
    CanvasEdit_ToolDatabase, AW.activeOverlay, AWc);
  toolbox.container = AW.activeOverlay;
  toolbox.startAnts(AWc.activeLayer[0], 2,2);
  //toolbox.antsOffset = 0;
  //toolbox.marchingAnts();
  
  var toolSelect = ui.addWindow(0, 0, 60, 500, 'white');
  toolSelect.attachToWorkspace(ToolSelect, toolbox);
  // Default tool to use at startup
  toolbox.useTool('path', function () {
    //AWc.zoom(0.1, 0, 0);
    //toolbox.top.pixel(20, 20, 255,0,0,255);
    //toolbox.top.update();
    AWc.updateOverlay();
  });
  
  // Need the commented out wrapper for testing tools.js include tools if
  // include getReady() in when statement, relavant if files are not local
  $(CanvasEdit_ToolDatabase).on('CanvasEdit_Custom', function () {
    var select = toolSelect.content;
    var list = this.tools; 

    for (var i in list) {
      select.addTool(i, list[i].graphic);
    }
    
    
    var database = this;
    database.addShortcut('shift+a', function (e) {
      console.log('all');
      e.preventDefault();
    });
    database.addShortcut('ctrl+s', function (e) {
      Canvas2Image.saveAsPNG(AWc.activeLayer[0].layer);
      e.preventDefault();
    });
  });
    
  DEBUG && alert('derp');
});

function loadHandle() {
  while(AC.width  == 0) AC.width  = prompt('Width',  AC.width);
  while(AC.height == 0) AC.height = prompt('Height', AC.height);
  AC.imageSize();
}