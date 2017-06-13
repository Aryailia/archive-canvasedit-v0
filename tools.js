// NOTE: Will have to test if one can remove the event referenced by
//       canvasEdit_toolM? if canvasEdit_toolM? gets changed and references
//       a different function then after it is added to a layer

// All tools will be added to the layer itself as event handlers, thus the
// variable this refers to the layer itself

// include 'drawing.js'

// Consolidated to do list:
// - marching ants selection
// - color wheel selection
// - selection tool

var PEN_POINT_RADIUS = 3;
var PEN_SNAP_TOLERANCE = 30;
var BEZIER_PRECISION = 20;
var ZOOM_EXPONENT_BASE = 1.2;

var IMAGE_DIRECTORY = 'Images/';
var TOOL_ICON_SIZE = '50px';

var canvasEditTemp; // Return value for the tool scripts loaded via ajax

(function () {
  var database = CanvasEdit_ToolDatabase;
  
  // Each include will modify the temp value
  // The temp value is the means to getreturn values to add to tool database
  var backup = canvasEditTemp;
  $.when(
    includeTool('freedraw.js'),
    includeTool('path.js'),
    includeTool('paint.js'),
    includeTool('selection.js'),
    getReady()
  ).done(function () {
    // Event to populate ToolSelect now that the tools have been added 
    $(database).trigger('CanvasEdit_Custom');
//    canvasEditTemp = backup; // restore the temp value
  });
  
  function getReady() {
    var deferredReady = $.Deferred();
    $(document).ready(function() {
      deferredReady.resolve();
    });
    return deferredReady.promise();
  }
  
  function goodLoad(data, textStatus, jqXHR) {
    if (backup !== canvasEditTemp) {
      database.addTool.apply(database, canvasEditTemp);
    }
  }
  
  function failLoad(jqXHR, textStatus, errorThrown) {
    DEBUG && console.log(' tool failed to load');
    console.log(jqXHR, textStatus, errorThrown);
  }
  
  function includeTool(name) {
    return $.ajax({
      url: 'Tools/' + name,
      dataType: 'script',
      mimeType: 'text/javascript',
      success: goodLoad,
      error: failLoad,
    });
  }
})();

var ToolSelect;

(function () {
  ToolSelect = function (workspace, overlay, width, height, client) {
    this.container = workspace;
    this.overlay = overlay;
    this.width = width;
    this.height = height;
    this.toolInterface = client;
    return this;
  }
  
  var method = ToolSelect.prototype;
  
  method.addTool = function (name, graphic) {
    var icon = $('<div />').css('background-color', 'blue').text(graphic)
      .innerWidth(TOOL_ICON_SIZE)
      .innerHeight(TOOL_ICON_SIZE);
    
    var self = this;
    icon.click(function () {
      self.toolInterface.useTool(name);
    });
    
    this.container.appendChild(icon.get(0));
  }
  
  function useTool_() {
  }
})();

/********************
 * NOTE: Need to add clarification as to what that, this, etc. are for each
 * function, since mouse will use this, otherwise won't
 * <this> refers to the ToolInterface object that is the parent to this tool
 * use <this.updateMousePos()> with <this.mouseX> and <this.mouseY> for mouse
 */
(function () {
  // Tool Prototype, Icon Graphic URL, Function Definition 
  canvasEditTemp = ['', '', toolDefinition];
  
  function toolDefinition() {
    this.cleanup = cleanup_;
    this.md = mousedown_;
    this.mm = mousemove_;
    this.mu = mouseup_;
    
    // Variables to be cleanup
    
  }
  
  function cleanup_() {
    
  }
  
  function mousedown_(e) {
    return false;
  }
  
  function mousemove_(e) {
    return false;
  }
  
  function mouseup_(e) {
    return false;
  }
})();