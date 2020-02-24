import * as THREE from "./three.module.js";

let Utils = { }

Utils.smoothstep = function(t) {
    return t * t * (3 - 2 * t);
}

let onceMemory = { }
Utils.once = function(tag) {
    if(!onceMemory[tag]) {
        onceMemory[tag] = true;
        return true;
    }

    return false;
}

Utils.parseIncludes = function( string ) {
    var utils_includepattern = /#include <(.*)>/gm;
    
    function replace( match , include ) {
        var replace = THREE.ShaderChunk[ include ];
        return Utils.parseIncludes( replace );
    }

    return string.replace( utils_includepattern, replace );
}

Utils.last = function(array) {
    return array[array.length - 1];
}

Utils.vec3Equal = function(a, b) {
    return a.x === b.x && a.y === b.y && a.z === b.z;
}

Utils.easings = {
    // no easing, no acceleration
    linear: function (t) { return t },
    // accelerating from zero velocity
    easeInQuad: function (t) { return t*t },
    // decelerating to zero velocity
    easeOutQuad: function (t) { return t*(2-t) },
    // acceleration until halfway, then deceleration
    easeInOutQuad: function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
    // accelerating from zero velocity 
    easeInCubic: function (t) { return t*t*t },
    // decelerating to zero velocity 
    easeOutCubic: function (t) { return (--t)*t*t+1 },
    // acceleration until halfway, then deceleration 
    easeInOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
    // accelerating from zero velocity 
    easeInQuart: function (t) { return t*t*t*t },
    // decelerating to zero velocity 
    easeOutQuart: function (t) { return 1-(--t)*t*t*t },
    // acceleration until halfway, then deceleration
    easeInOutQuart: function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
    // accelerating from zero velocity
    easeInQuint: function (t) { return t*t*t*t*t },
    // decelerating to zero velocity
    easeOutQuint: function (t) { return 1+(--t)*t*t*t*t },
    // acceleration until halfway, then deceleration 
    easeInOutQuint: function (t) { return t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t }
}

Utils.toCamelCase = function(str, splitter) {
    if(!splitter) splitter = " ";

    return str.split(splitter).map(function(word,index) {
      // If it is the first word make sure to lowercase all the chars.
      if(index == 0){
        return word.toLowerCase();
      }
      // If it is not the first word only upper case the first char and lowercase the rest.
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join('');
}

Utils.removeAllChildren = function(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
} 

Utils.setAllAsUnactive = function(array) {
    for(let i = 0; i < array.length; i++) {
        let element = array[i];
        element.classList.remove("active");
    }
}

Utils.inchesToHeightString = function(value) {
    let feet   = Math.floor(value / 12);
    let inches = value % 12;

    return "" + feet + "' " + inches + "''";   
}

Utils.getJSON = function(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status == "200") {
            var jsonData = JSON.parse(rawFile.responseText);
            callback(jsonData);
        }
    };
    rawFile.send(null);
}

export default Utils;