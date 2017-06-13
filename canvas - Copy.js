// Copyright Matthew King 2012
// Released under the GNU Public License v3.0
//
// Centralized to do list:
//  - Undo
//  - Zoom
//  - Turn background div into a checkered
//  - Get deletion of groups and layers working
//  - The work of performing different blending effects will be implemented
//    along with the re-rendering phase of the object.

// include tool.js

// The canvas class for Canvas Edit
//
// Layers are stored as an array that holds a wrapping object around the html
// canvas tag. This wrapper is specified in the private LayerEntry_ function.
//
// Groups of layers are stored as an array of linked lists with a single linked
// list representing a group. Linked lists preserve the order of the layers, as
// well as being easily manipulable as an organization structure requires. The
// linked list is itself a node who's <node> field points to the last node
// and <next> field points to the next next. Each element of the linked list
// points to <layers_>, and the enumerated <groups_> evalutes to <layers_>.
//
// There intentionally is no add/delete groupElement, these functions are
// handled in splitGroup, joinToGroup, addLayer, deleteLayer
//
// It is my recommendation to surround large graphical changes with
// CanvasEdit.hide() and CanvasEdit.show() to reduce reflows
// 
// Alot of the code relies on the linked list being in order, so keep it such!

var LAYERSELECT_FOOTER_HEIGHT = 100;

var CanvasEdit;

// Imbedding in anon func makes LayerEntry and LayerGroup private
(function () {
  "use strict";
   var layer_uid_ = 0; // mainly for debugging purposes
  /**
   * Constructor. Creates the a checker board div background as a backdrop for
   * transparent layers and an initial white layer.
   * Creates two temp layers on top of everything, in the the <overlaycontainer>
   * typically for tool usage. <.sandbox> is ontop of <.stratchpad>
   * @public
   * @constructor
   * @param container - the DOM object to which the layers are attached
   * @param container - the DOM object to which the layers are attached
   * @param width - the width to make the canvas workspace
   * @param height - the height to make the canvas workspace
   * @returns this - as constructors do
   **/
  CanvasEdit = function (layercontainer, overlaycontainer, width, height) {
    this.container = layercontainer;
    this.width = width;
    this.height = height;
    
    this.scale = 0;
    this.zoomX = 0;
    this.zoomY = 0;
    this.activeLayer = [];
    this.layers_ = []; // _ suffix means private, however cannot without
    this.groups_ = []; // redefining everything every CanvasEdit call
    this.nodes = new GroupNode_('', layercontainer);
    this.nodes.isFirst = true;
    this.nodes.before = { parent: this.nodes, next: null };
    this.nodes.after = { parent: this.nodes, prev: null };
    
    this.stratchpad = makeDrawspace_(width, height, 1);
    this.sandbox = makeDrawspace_(width, height, 2);
    var firstLayer = makeLayer_(width, height, 0,
      this.nodes, this.nodes.before, this.nodes.after);
    this.nodes.push(firstLayer);
    firstLayer.layer.style.backgroundColor = 'white';
    this.selectLayer(firstLayer);
    
    layercontainer.appendChild(firstLayer.layer);
    overlaycontainer.appendChild(this.stratchpad.layer);
    overlaycontainer.appendChild(this.sandbox.layer);
    return this;
  }

  var method = CanvasEdit.prototype; // local var for faster access
  
  /****************************************************************************
   * Private helper/structure functions and debugging functions
   ****************************************************************************/
  function makeDrawspace_(width, height, z) {
    var cvs = document.createElement('canvas');
    cvs.setAttribute('width',  width);
    cvs.setAttribute('height', height);
    cvs.style.width = width + 'px';
    cvs.style.height = height + 'px';
    cvs.style.backgroundColor = 'transparent';
    cvs.style.position = 'absolute';
    z === undefined || (cvs.style.zIndex = z);
    //cvs.zoom(1);
    return new LayerEntry_(cvs);
  }
  
  function makeLayer_(width, height, z, group, prev, next) {
    var layer = makeDrawspace_(width, height, z);
    layer.title = 'Layer ' + ++layer_uid_;
    layer.parent = group;
    prev.next = layer;
    layer.prev = prev;
    layer.next = next;
    next.prev = layer;
    return layer;
  }
  
  
  /**
   * Debugging function, prints the groups_ array out, "groupIndex: zIndex"
   * @public
   **/
  method.test = function () {
    console.log('\nGroup Test: ', this.nodes);
    var stack = [this.nodes];
    var s = '';
    do {
      var t = '';
      var x = stack.pop();
      if (x.isGroup) {
        s += '+-'
        t += 'Group'
        var list = x.children;
        for ( var i = list.length - 1; i >= 0; --i) {
          stack.push(list[i]);
        }
      } else {
        t += '--Layer';
      }
      console.log(s.substring(2) + t, x);
    } while (stack.length > 0); 
  };
  
  method.test2 = function () {
    console.log('\nLayer Test: ');
    var x = this.nodes.before;
    var test = true;
    while (x.next.layer !== undefined) {
      x = x.next;
      var z = x.layer.style.zIndex
      var s = z;
      if (x.prev.layer !== undefined) {
        var i = x.prev.layer.style.zIndex;
        s += ' ' + i;
        test = test && parseInt(z, 10) - parseInt(i, 10) == 1; 
      }
      if (x.next.layer !== undefined) {
        var i = x.next.layer.style.zIndex;
        s += ' ' + i;
        test = test && parseInt(z, 10) - parseInt(i, 10) == -1; 
      }
      console.log(x, x.title, s, test);
    }
  }
  
  /****************************************************************************
   * Layer functions
   ****************************************************************************/
  /**
   * Wrappers for canvas objects that form layers, layers_ is an array of this
   * NOTE: Be sure to update getGroupInfo accordingly, particularly groupIndex
   * @param canvasObject - the canvas DOM element
   * @param groupIndex - the index of the group containing this layer
   * @private
   * @constructor
   **/
  function LayerEntry_(canvas) {
    var buf, data, buf8;
    if (canvas) {
      var buf = new ArrayBuffer(canvas.width * canvas.height * 4);
      var data = new Uint32Array(buf);
      var buf8 = new Uint8ClampedArray(buf);
    }
    
    this.title = '';
    this.array_ = buf;
    this.pixels = data;
    this.buffer = buf8;
    this.layer = new CanvasEditContext(canvas, data, buf8);
    this.type = 0;
    this.visible = true;
    this.blendingData = {};
    this.prev = null;
    this.next = null;
    return this;
  }

  LayerEntry_.prototype.move = moveNode_;
  
  /**
   * Pushes and returns a transparent placed on top of all the layers.
   * Use moveGroup, or moveLayer to o
   * Puts the burden of rendering on the browser instead of the javascript
   * compiler, which has access to more advanced hardware acceleration.
   * @public
   * @returns {layerEntry_} - the wrapper for the layer added
   **/
  method.addLayer = function () {
    var after = this.nodes.after;
    var before = after.prev;
    var z = parseInt(before.layer.style.zIndex, 10) + 1;
    
    // Add to this.layers_ and assign the appropriate zIndex
    var entry = makeLayer_(this.width, this.height, z, this.nodes,
      before, after);
    this.nodes.push(entry);
    
    this.container.appendChild(entry.layer);
    return entry;
  };
  
  /**
   * Move the layer indexed at <from> and places it at position <target>
   * @public
   * @requires independant of regular moveLayer
   * @param from - the index of the layer to move
   * @param target - the position to move the layer to
   **/
  method.deleteLayer = function (index) {
  };
    
  // Toggles the visibility of the layer indexed at index
  method.toggleLayerVisibility = function (index) {
//    $(AC.getLayer(3)).hide(false);
//    this.getLayer(index).style.hidden = 
    this.layers_[index].visible = !this.layers_[index].visible;
  };
  
  
  // Returns the dom element canvas for the layer indexed by index
  // If no index is given then the active layer is given
  method.getLayer = function (index) {
    var layer = this.nodes.before;
    //if (index <= ) {
    for (var x = 0; x <= index; ++x) {
      layer = layer.next;
    }
    return layer;
  };
  
  // Testing for selection implementation
  method.getLayerObject = function (index) {
    return this.activeLayer[0];
  };
  
  // Denotes the layer indexed at index as the current active layer
  method.selectLayer = function (layer) {
    //if (this.nodes.find())
    this.activeLayer[0] = layer;
  };
  
  
  /****************************************************************************
   * Organization functions
   ****************************************************************************/
  /**
   * For the linked list, <.node> points to the last, <.next> to the first node
   * Otherwise, <.node> points to content, <.next> to the next element
   * @param content - content for the node to contain, <.node> maps to this
   * @param next - what <.next> should point to
   * @private
   * @constructor
   **/
  function GroupNode_(title, parent) {
    this.title = title;
    this.parent = parent;
    this.children = [];
    this.isGroup = true;
  }
  
  GroupNode_.prototype.add = function (obj, index) {
    this.children.splice(index, 0, obj);
  }
  
  GroupNode_.prototype.push = function (obj) {
    this.children.push(obj);
  }
  
  GroupNode_.prototype.remove = function (index) {
    return this.children.splice(index, 1)[0];
  }
  
  // Searches within the array <this.children> for <obj> and returns its index
  GroupNode_.prototype.find = function (obj) {
    var list = this.children;
    var i = list.length - 1;
    for (; i >= 0 && list[i] != obj; --i) { }
    DEBUG & i < 0 && console.log('Cannot find', obj, 'in group');
    return i;
  }
  
  /**
   * Move the group indexed at <from> and places it at position <target>
   * @public
   * @param from - the index of the group to move
   * @param target - the position to move the group to
   **/
  GroupNode_.prototype.move = moveNode_;
  
  // Searchs <group>'s children from start and end and dir
  function findInteriorLayer_(group, start, end, dir) {
    var list = group.children;
    for (var i = start; i != end; i += dir) {
      var x = list[i];
      if (x.isGroup) {
        var len = x.children.length;
        if (dir == -1) x = findInteriorLayer_(x, len - 1, -1, -1);
        else           x = findInteriorLayer_(x, 0, len, 1);
      }
      if (!x.isGroup) return x;
    }
    return group;
  }
  
  /**
   * Find the representative layer for this group searching in <dir> direction
   * @public
   * @param  - the index of the group to move
   * @param target - the position to move the group to
   **/
  // <CanvasEdit.nodes> or the folder structure
  GroupNode_.prototype.findLayer = function (dir) {
    var len = this.children.length;
    var start, stop, node;
    if (dir == -1) {
      start = len - 1;
      stop = -1;
      node = findInteriorLayer_(this, 0, len, -dir);
    } else {
      start = 0;
      stop = len;
      node = findInteriorLayer_(this, len - 1, -1, -dir);
    }
    
    while (node.isGroup) {
      var i = node.parent.find(node) + dir;
      node = node.parent;
      // Opposite direciton <stop> is always -1
      if (dir == 1) stop = node.children.length;
      
      // Reverse directions if there's no more layers in the current direction
      if (node.isFirst && i == stop) {
        if (stop == -1) return node.before;
        else            return node.after;
      }
      node = findInteriorLayer_(node, i, stop, dir);
    }
    return node;
  }
  
  // Note movee is the same as target, it should restructure the same way
  function moveNode_(group, index) {
    var list = this.children;
    // <n1> is start, and <n2> is end, <n1> === <n2> if <this> is a layer
    var n1 = (this.isGroup) ? this.findLayer(-1) : this;
    var n2 = (this.isGroup) ? this.findLayer(1) : this;
    
    var target; // For the target to which to move the layer/group <n1>:<n2>
    var sameGroup = group == this.parent;
    var insertAfter = index >= group.children.length;
    // If adding after all existing elements (or to a new list) 
    if (insertAfter) {
      // Search downwards through the layers through the threaded structure
      target = group.findLayer(-1);
    } else { // Otherwise <group.children[index]> exists
      target = group.children[index];
      if (target.isGroup) target = target.findLayer(-1);
    }
    
    // Remove from the previous group, and add to new group
    this.parent.remove(this.parent.find(this));
    group.add(this, index);
    
    // <x1> is the position/zIndex of the start of the movee
    // <x2> would be the end of movee, so the same as <x1> if a layer
    // <x3> is the position/zIndex of the target
    var x1 = parseInt(n1.layer.style.zIndex, 10);
    var x3 = parseInt(target.layer.style.zIndex, 10);
    var z = Math.min(x1, x3);
    var start = (x1 < x3) ? n1.prev : target.prev;
    
    // Only have to perform an insert after if
    // 1. Movee and target both reside in the same group and <x1> < <x3>
    //    Because target would shift lower and movee would replace it
    // 2. If you're adding to a different group and after everything else
    if ((sameGroup && x1 < x3) || (!sameGroup && insertAfter))
      target = target.next;
    
    // Fix the structure from where <this> was, a removal
    n1.prev.next = n2.next;
    n2.next.prev = n1.prev;
    
    // Fix the structure to where <this> is moved, an insertion
    n1.prev = target.prev;
    n2.next = target.prev.next;
    n1.prev.next = n1;
    n2.next.prev = n2;
      
    // Update all the z-indices
    do {
      start = start.next;
      start.layer.style.zIndex = z;
      ++z;
    } while (start.next.layer !== undefined);
  }
  
  method.removeNode = function () {
  }
   
  method.addFolder = function (group, index, title) {
    var folder = new GroupNode_(title, group);
    group.add(folder, index);
    return folder;
  }
  
  /****************************************************************************
   * Utility Functions
   ****************************************************************************/
  method.hide = function() {
    this.container.style.layer = 'none';
  }
  
  method.show = function() {
    this.container.style.layer = 'block';
  }

  // Draws a test shape on layer indexed by layer
  method.drawTestShape = function (layer, startX, startY, style) {
    var ctx = this.getLayer(layer).layer.getContext('2d');
//    var ctx = this.layers_[layer].layer.getContext('2d');
    ctx.fillStyle = style;
    ctx.beginPath();
    ctx.moveTo(0 + startX, 0 + startY);
    ctx.lineTo(120 + startX, 120 + startY);
    ctx.bezierCurveTo(30+startX, 40+startY, 30+startX,
      40+startY, 40+startX, 120+startY); 
    ctx.lineTo(0 + startX, 0 + startY);
    ctx.fill();
    ctx.closePath();
  };
  
  // Changes the picture's resolution
  method.imageSize = function (x, y) {
    this.width = x;
    this.height = y;
    this.container.style.width = x + 'px';
    this.container.style.height = y + 'px';
  //  this.zoom(0);
  };
  
  function zoom_(ctx, x, y, s) {
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.translate(-x, -y);
  }
  
  // zoom by the factor scale
  method.zoom = function (scale, at_x, at_y) {
    var centerX = at_x === undefined ? 0 : at_x;
    var centerY = at_y === undefined ? 0 : at_y;
    this.scale = scale;
    var s = Math.pow(ZOOM_EXPONENT_BASE, scale);
//    var s = Math.pow(2, scale);
    for (var i = this.layers_.length - 1; i >= 0; --i)
      zoom_(this.layers_[i].layer.getContext('2d'), centerX, centerY, s);
    zoom_(this.stratchpad.getContext('2d'), centerX, centerY, s);
    zoom_(this.sandbox.getContext('2d'), centerX, centerY, s);
    
    
  };
  
  // Updates the zooms to account for scaling
  method.update = function () {
    var list = this.layers_;
    for (var i = this.layers_.length - 1; i >= 0; --i) {
      list[i].layer.getContext('2d').drawImage(this.layers_[i].layer, 0, 0);
    }
  //  this.updateOverlay();
  };
  
  method.updateOverlay = function () {
//    this.stratchdisp.getContext('2d').drawImage(this.stratchpad, 0, 0);
//    this.sanddisp.getContext('2d').drawImage(this.sandbox, 0, 0);
  }

}());

var LayerSelect;
(function () {
  LayerSelect = function (workspace, overlay, width, height, canvasEdit) {
    this.canvasEdit = canvasEdit;
    this.container = workspace;
    workspace.className += 'layer-select';
    this.groupClass = 'testconnect';
    this.layerClass = 'testconnect';
    
    DEBUG && height < LAYERSELECT_FOOTER_HEIGHT && console.log(
      'LayerSelect: Height too small, footer cannot fit');
    
    this.layerList = document.createElement('div');
    this.layerList.style.width = width + 'px';
    this.layerList.style.height = (height - LAYERSELECT_FOOTER_HEIGHT) + 'px';
    this.layerList.style.overflow = 'scroll';
    this.footer = document.createElement('div');
    this.footer.style.width = width + 'px';
    this.footer.style.height = LAYERSELECT_FOOTER_HEIGHT + 'px';
    
    // Builds the layer list
    this.refresh();
    
    // Build the footer
    var that = this;
    this.textbox = document.createElement('input');
    this.layerbox = document.createElement('span');
    this.layerbox.textContent = '+layer';
    $(this.layerbox).click(function () { that.addLayer(); });
    this.folderbox = document.createElement('span');
    this.folderbox.textContent = '+folder'; 
    $(this.folderbox).click(function () { that.addFolder(); });
    
    this.footer.appendChild(this.textbox);
    this.footer.appendChild(this.layerbox);
    this.footer.appendChild(this.folderbox);
    
    workspace.appendChild(this.layerList);
    workspace.appendChild(this.footer);
    return this;
  };
  
  var method = LayerSelect.prototype;
  
  /********************************************
   * DOM creation private functions
   ******/
  
  // The base dom creation function
  // saves obj as data
  function makeLayer_(obj, className) {
    var layer = document.createElement('div');
    layer.className = 'layer ' + className;
        
    var handle = document.createElement('span');
    handle.className = 'layer-handle';
    handle.textContent = ' ';
    
    var title = document.createElement('span');
    title.textContent = obj.title;
    title.className = 'layer-name';
    
    $(layer).click({ layerSelect: this }, selected_);
    
    //layer.appendChild(handle);
    layer.appendChild(title);
    $(layer).data('CanvasEdit_node', obj);
    return layer;
  }
  
  // Creates the container div for the layer list
  // Handles the JqueryUI.sortable behaviour
  // handles the JqueryUI.selectable behaviour
  function makeGroupList_(obj, className) {
    var list = $('<div />') ;
    list.data('CanvasEdit_node', obj);
    
    list.sortable({
      connectWith: '.' + className,
      stop: stop_,
    });
    return list;
  }
  
  // This calls makeLayer_ and makeGroupList_
  function makeGroup_(obj, className) {
    var group = makeLayer_.call(this, obj, className);
    
    var content = makeGroupList_(obj, className).get(0);
    content.className = 'testconnect';
    var spaceholder = $('<div />').text('spaceholder');
    //content.appendChild(spaceholder.get(0));
    
    group.appendChild(content);
    return group;
  }
  
  function constructDOM_(node, grpClass, layClass) {
    var dom;
    if (node.isGroup) {
      var list = node.children;
      dom = makeGroup_.call(this, node, grpClass);
      for (var i = 0; i < list.length; ++i) {
        var x = constructDOM_.call(this, list[i], grpClass, layClass);
        dom.appendChild(x);
      }
    } else {
      dom = makeLayer_.call(this, node, layClass);
    }
    return dom;
  }
  
  
  
  /**************
   * Behaviour Private Functions
   **************/
  // 
  function selected_(event) {
    var node = $(this).data('CanvasEdit_node')
    event.data.layerSelect.select(node);
  }
  
  // The prefixed $ variables are the jQuery elements contained in LayerSelect
  // The suffixed Node variables are memory objects contained in CanvasEdit
  function stop_(event, ui) {
    var $entry = ui.item;
    var entryNode = $entry.data('CanvasEdit_node');
    var before = entryNode.parent.find(entryNode);
    
    var $parent = $entry.parent();
    var parentNode = $parent.data('CanvasEdit_node');
    var after = $parent.children().index($entry);
    
    entryNode.move(parentNode, after);
  }
  
  /**************
   * Public Methods
   **************/
  
  method.addLayer = function () {
    var title = '';
    var index = 0;
    var node = this.canvasEdit.addLayer();
    var dom = makeLayer_(node, this.layerClass);
    this.layerList.appendChild(dom);
  };
  
  method.addFolder = function () {
    var ce = this.canvasEdit;
    var index = ce.nodes.length;
    var title = 'New Folder';
    var node = ce.addFolder(ce.nodes, index, title);
    var dom = makeGroup_(node, this.groupClass);
    this.layerList.appendChild(dom);
  };
  
  method.select = function (node) {
    console.log(node);
    this.canvasEdit.selectLayer(node);
  }
  
  method.refresh = function () {
    $(this.layerList).empty();
    var editor = this.canvasEdit;
    var node = editor.nodes;
    var main = node.children;
    var grpClass = this.groupClass
    var layClass = this.layerClass;
    
    var list = makeGroupList_.call(this, node, grpClass);
    for (var i = 0; i < main.length; ++i) {
      var x = constructDOM_.call(this, main[i], grpClass, layClass);
      list.append(x);
    }
    this.layerList.appendChild(list.get(0));
  }
})();