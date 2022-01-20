// Copyright (c) Kris Hauser
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';

import { MODULE_NAME, MODULE_VERSION } from './version';

import { KlamptFrontend } from './KlamptFrontend'

// Import the CSS
import '../css/widget.css';

function isEmpty(ob : Object){
  // @ts-ignore
  for(var i in ob){ return false;}
  return true;
}

//let workaround_events = ['mousemove','mousedown','mouseup','touchmove','touchstart','touchend','wheel'];
let workaround_events = [''];

export class KlamptModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: KlamptModel.model_name,
      _model_module: KlamptModel.model_module,
      _model_module_version: KlamptModel.model_module_version,
      _view_name: KlamptModel.view_name,
      _view_module: KlamptModel.view_module,
      _view_module_version: KlamptModel.view_module_version,
      _camera : {'camera is':'first time in javascript'},
      events : []
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  };

  static model_name = 'KlamptModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'KlamptView'; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;
}

export class KlamptView extends DOMWidgetView {
  klamptArea : HTMLElement;
  messageArea : HTMLElement;
  klampt : KlamptFrontend;
  waitDraw : boolean;
  pendingRpcs : Array<Object>;
  handlingEvent : boolean;

  initialize(parameters: any) {
    super.initialize(parameters);
    this.el.classList.add('custom-widget');
    this.el.addEventListener('mouseover', this );
    this.el.addEventListener('mouseleave', this );
    this.el.addEventListener('focusin', this );
    this.el.addEventListener('focusout', this );
    this.el.addEventListener('contextmenu', this);
    this.waitDraw = false;
    this.pendingRpcs = [];
    this.handlingEvent = false;
    this.klamptArea = this.createDiv();
    this.el.appendChild(this.klamptArea);
    this.messageArea = document.createElement("div");
    this.el.appendChild(this.messageArea);
  }

  render() {
    console.log("Initialize Klampt frontend");
    
    this.klampt = new KlamptFrontend(this.klamptArea);
    var _this = this;
    this.klampt.set_camera_callback(function() {
            var cam = _this.klampt.get_camera();
            _this.model.set('_camera',cam);
            _this.touch();
        });
    this.model.on('change:scene', this.scene_changed, this);
    this.model.on('change:transforms', this.transforms_changed, this);
    this.model.on('change:rpc', this.rpc_changed, this);
    //this.klampt.resize(this.model.get('width'),this.model.get('height'));

    //write initial camera to model
    var cam = this.klampt.get_camera();
    this.model.set('_camera',cam);
    var redraw = false;
    if(!isEmpty(this.model.get('scene'))) {
        console.log("KlamptView.render: scene not empty");
        //this.scene_changed();
        this.klampt.update_scene(this.model.get('scene'));
        redraw=true;
    }
    if(!isEmpty(this.model.get('transforms'))) {
        console.log("KlamptView.render: transforms not empty");
        //this.transforms_changed();
        this.klampt.update_scene(this.model.get('transforms'));
        redraw=true;
    }
    if(!isEmpty(this.model.get('rpc'))) {
        console.log("KlamptView.render: rpc not empty");
        //this.rpc_changed();
        this.do_rpc(this.model.get('rpc'));
        redraw=true;
    }
    if(redraw) {
        setTimeout(this.redraw.bind(this),0);
    }
  }

  redraw() {
    this.klampt.render();
    this.model.set('drawn',1);
    this.touch();
  }

  createDiv() {
    var width = this.model.get('width');
    var height = this.model.get('height');
    var div = document.createElement("div");
    div.style.width = width+"px";
    div.style.height = height+"px";
    return div;
  }

  handleEvent(event : Event) {
    if(this.handlingEvent) {
      return;
    }
    if(event.type == 'keydown') this.keydown(event);
    else if(event.type == 'keyup') this.keyup(event);
    else if(event.type == 'focusin' || event.type == 'mouseover') this.startCapture(event);
    else if(event.type == 'focusout' || event.type == 'mouseleave') this.stopCapture(event);  
    else if(event.type == 'contextmenu') {
      event.stopPropagation();
      event.preventDefault();
    }
    else if(workaround_events.indexOf(event.type) >= 0) {
      this.handlingEvent = true;
      if(event.type.startsWith('mouse')) {
        let newevent = new MouseEvent(event.type,event);
        this.klamptArea.dispatchEvent(newevent);
      }
      else if(event.type.startsWith('touch')){
        let newevent = new TouchEvent(event.type,event);
        this.klamptArea.dispatchEvent(newevent);
      }
      else {
        let newevent = new WheelEvent(event.type, event);
        this.klamptArea.dispatchEvent(newevent);
      }
      event.stopPropagation();
      event.preventDefault();
      this.handlingEvent = false;
    }
  }

  startCapture(event : any) {
    let capture_event = true;
    let tab_index = "-4242";
    ///need to bypass Jupyterlab's event handling
    document.addEventListener('keydown', this, capture_event)
    document.addEventListener('keyup', this, capture_event)
    for(let ev in workaround_events) {
      document.addEventListener(workaround_events[ev], this, capture_event)
    }

    // Try to focus....
    this.el.focus({preventScroll:true})

    if (this.el != document.activeElement) {
        // We didn't actually focus, so make sure the element can be focused...
        this.el.setAttribute("tabindex", tab_index)
        this.el.focus({preventScroll:true})
    }
  }

  stopCapture(event : any) {
    let capture_event = true;
    let tab_index = "-4242";
    document.removeEventListener('keydown', this, capture_event);
    document.removeEventListener('keyup', this, capture_event);
    for(let ev in workaround_events) {
      document.removeEventListener(workaround_events[ev], this, capture_event)
    }

    // Remove the tabindex if we added it...
    if (this.el.getAttribute("tabindex") == tab_index) {
      this.el.removeAttribute("tabindex")
    }
    this.el.blur()
  }
    

  keydown(event : any) {
    console.log("Got a keydown event "+event.keyCode);
    var events = [...this.model.get('events')];
    events.push(event);
    this.model.set('event',events);
    this.touch();
    event.stopPropagation();
    event.preventDefault();
  }
  keyup(event : any) {
    console.log("Got a keyup event "+event.keyCode);
    event.stopPropagation();
    event.preventDefault();
  }
  scene_changed() {
      var msg = this.model.get('scene');
      console.log("Klamp't widget: setting scene");
      if(this.waitDraw) {
          this.klampt.update_scene(msg);
      }
      else {
          var _this = this;
          this.waitDraw=true;
          setTimeout(function() {
              _this.klampt.update_scene(msg);
              _this.klampt.render();
              _this.model.set('drawn',1);
              _this.touch();
              _this.waitDraw=false;
              },0);
      }
  }
  transforms_changed() {
      var msg = this.model.get('transforms');
      //console.log("Klamp't widget: setting transforms");
      if(this.waitDraw) {
          this.klampt.update_scene(msg);
      }
      else {
          var _this = this;
          this.waitDraw=true;
          setTimeout(function() {
              _this.klampt.update_scene(msg);
              _this.klampt.render();
              _this.model.set('drawn',1);
              _this.touch();
              _this.waitDraw=false;
              },0);
      }
  }
  do_rpc(msg : any) {
      if(msg.type == 'multiple') {
          for(var i=0; i<msg.calls.length; i++) {
              this.do_rpc(msg.calls[i]);
          }
      }
      else if(msg.type == 'reset_scene') {
          //console.log("Klamp't widget: resetting scene");
          this.klampt.reset_scene();
      }
      else if(msg.type == 'reset_camera') {
          //console.log("Klamp't widget: calling reset_camera");
          this.klampt.reset_camera();
      }
      else {
          //console.log("Klamp't widget: calling rpc "+msg);
          this.klampt.rpc(msg);
      }
  }
  rpc_changed() {
      var msg = this.model.get('rpc');
      //console.log("rpc "+msg);
      if(this.waitDraw) {
          this.pendingRpcs.push(msg);
      }
      else {
          var _this = this;
          this.waitDraw=true;
          setTimeout(function() { 
              _this.do_rpc(msg); 
              for(var i=0;i<_this.pendingRpcs.length;i++)
                  _this.do_rpc(_this.pendingRpcs[i]);
              _this.pendingRpcs = []
              _this.klampt.render();
              _this.model.set('drawn',1);
              _this.touch();
              _this.waitDraw=false;
          },0);
      }
  }
}
