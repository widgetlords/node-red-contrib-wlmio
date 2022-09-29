const wlmiojs = require("wlmiojs");


const wlmioNodes = new Array(128);
for(let i = 0; i < 128; i += 1)
{ wlmioNodes[i] = { callbacks: new Set() }; }

function registerCallback(id, cb)
{ wlmioNodes[id].callbacks.add(cb); }

function deregisterCallback(id, cb)
{ wlmioNodes[id].callbacks.delete(cb); }

wlmiojs.setStatusCallback(function(id, oldStatus, newStatus)
  {
    if((oldStatus.mode == 7 && newStatus.mode != 7) || (newStatus.uptime < oldStatus.uptime && newStatus.uptime > 0))
    {
      wlmioNodes[id].status = newStatus;
      wlmiojs.getInfo(id, function(r, info)
        { 
          if(r >= 0) 
          { 
            wlmioNodes[id].info = wlmiojs.unpackNodeInfo(info);
            wlmioNodes[id].callbacks.forEach(cb => cb());
          }
          else
          { wlmioNodes[id].info = null; }
        }
      );
    }
    else if(newStatus.mode == 7)
    { 
      wlmioNodes[id].status = undefined;
      wlmioNodes[id].info = undefined;
    }
    else
    { wlmioNodes[id].status = newStatus; }
  }
);


module.exports = function(RED)
{
  function WLMIORegister(config)
  {
    RED.nodes.createNode(this, config);
    const node = this;
    const id = parseInt(config.nid);
    const register = config.regname;
    let type = parseInt(config.regtype);
        
    node.on("input", function(msg, send, done)
      {
        const value = msg.payload;
        if(isNaN(type) || !Array.isArray(value))
        { type = 0; }
        const buffer = wlmiojs.packRegisterAccess(type, value);
        const r = wlmiojs.registerAccess(id, register, buffer, function(r, b)
          {
            const result = wlmiojs.unpackRegisterAccess(b);
            if(result.type == 0)
            {
              done("Register does not exist on module");
              return;
            }
            msg.payload = result.value;
            node.send(msg);
            done();
          }
        );
        if(r < 0)
        { done("Error accessing register"); }
      }
    );
  }
  RED.nodes.registerType("wlmio-register", WLMIORegister);


  function WLMIOStatus(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.on("input", function(msg, send, done) {
      const id = msg.payload;
      if(!Number.isInteger(id) || id < 0 || id > 127) {
        done("Invalid WLMIO node ID");
        return;
      }
      const status = {
        status: wlmioNodes[id].status ? { ...wlmioNodes[id].status } : null,
        info: wlmioNodes[id].info ? { ...wlmioNodes[id].info } : null
      };
      msg.payload = status;
      send(msg);
      done();
    });
  }
  RED.nodes.registerType("wlmio-status", WLMIOStatus);


  function WLMIO6010(config)
  {
    RED.nodes.createNode(this, config);
    const node = this;
    const id = parseInt(config.nid);

    node.on("input", function(msg, send, done)
      {
        const ni = wlmioNodes[id];
        if(!ni.status)
        {
          done("Missing module");
          return;
        }
        else if(ni.info == undefined)
        { return; }
        else if(ni.info == null || ni.info.name != "com.widgetlords.mio.6010")
        {
          done("Incorrect module installed");
          return;
        }

        const buffer = wlmiojs.packRegisterAccess(0, null);
        const r = wlmiojs.registerAccess(id, "input", buffer, function(r, b)
          {
            if(r < 0)
            { done("Error communicating with module"); }
            else
            { 
              const result = wlmiojs.unpackRegisterAccess(b);
              if(result.type != 10)
              { done("Error communicating with module"); }
              else
              {
                msg.payload = result.value;
                send(msg);
                done();
              }
            }
          }
        );
        if(r < 0)
        { done("Error communicating with module"); }
      }
    );
  }
  RED.nodes.registerType("wlmio-6010", WLMIO6010);


  function WLMIO6030(config)
  {
    RED.nodes.createNode(this, config);
    const node = this;
    const id = parseInt(config.nid);
    const channel = parseInt(config.channel);

    node.on("input", function(msg, send, done)
      {
        const ni = wlmioNodes[id];
        if(!ni.status)
        {
          done("Missing module");
          return;
        }
        else if(ni.info == undefined)
        { return; }
        else if(ni.info == null || ni.info.name != "com.widgetlords.mio.6030")
        {
          done("Incorrect module installed");
          return;
        }

        const buffer = wlmiojs.packRegisterAccess(11, [ msg.payload ]);
        const reg = "ch" + channel + ".output"; 
        const r = wlmiojs.registerAccess(id, reg, buffer, function(r, b)
          {
            if(r < 0)
            { done("Error communicating with module"); }
            else
            { done(); }
          }
        );
        if(r < 0)
        { done("Error communicating with module"); }
      }
    );
  }
  RED.nodes.registerType("wlmio-6030", WLMIO6030);


  function WLMIO6040(config)
  {
    RED.nodes.createNode(this, config);
    const node = this;
    const id = parseInt(config.nid);
    const channel = parseInt(config.channel);
    const mode = parseInt(config.mode);

    node.on("input", function(msg, send, done)
      {
        const ni = wlmioNodes[id];
        if(!ni.status)
        {
          done("Missing module");
          return;
        }
        else if(ni.info == undefined)
        { return; }
        else if(ni.info == null || ni.info.name != "com.widgetlords.mio.6040")
        {
          done("Incorrect module installed");
          return;
        }

        const buffer = wlmiojs.packRegisterAccess(0, null);
        const reg = "ch" + channel + ".input";
        const r = wlmiojs.registerAccess(id, reg, buffer, function(r, b)
          {
            if(r < 0)
            { done("Error communicating with module"); }
            else
            { 
              const result = wlmiojs.unpackRegisterAccess(b);
              if(result.type != 10)
              { done("Error communicating with module"); }
              else
              {
                msg.payload = result.value[0];
                send(msg);
                done();
              }
            }
          }
        );
        if(r < 0)
        { done("Error communicating with module"); }
      }
    );

    function doConfig()
    {
      const buffer = wlmiojs.packRegisterAccess(11, [ mode ]);
      const reg = "ch" + channel + ".mode";
      wlmiojs.registerAccess(id, reg, buffer, function(r, b)
        {
          if(r < 0)
          { node.error("Failed to configure channel"); }
        }
      );
    }
    registerCallback(id, doConfig);

    node.on("close", function()
      { deregisterCallback(id, doConfig); }
    );

    doConfig();
  }
  RED.nodes.registerType("wlmio-6040", WLMIO6040);


  function WLMIO6050(config)
  {
    RED.nodes.createNode(this, config);
    const node = this;
    const id = parseInt(config.nid);
    const channel = parseInt(config.channel);
    const mode = parseInt(config.mode);

    node.on("input", function(msg, send, done)
      {
        const ni = wlmioNodes[id];
        if(!ni.status)
        {
          done("Missing module");
          return;
        }
        else if(ni.info == undefined)
        { return; }
        else if(ni.info == null || ni.info.name != "com.widgetlords.mio.6050")
        {
          done("Incorrect module installed");
          return;
        }

        const buffer = wlmiojs.packRegisterAccess(10, [ msg.payload ]);
        const reg = "ch" + channel + ".output";
        const r = wlmiojs.registerAccess(id, reg, buffer, function(r, b)
          {
            if(r < 0)
            { done("Error communicating with module"); }
            else
            { done(); }
          }
        );
        if(r < 0)
        { done("Error communicating with module"); }
      }
    );

    function doConfig()
    {
      const buffer = wlmiojs.packRegisterAccess(11, [ mode ]);
      const reg = "ch" + channel + ".mode";
      wlmiojs.registerAccess(id, reg, buffer, function(r, b)
        {
          if(r < 0)
          { node.error("Failed to configure channel"); }
        }
      );
    }
    registerCallback(id, doConfig);

    node.on("close", function()
      { deregisterCallback(id, doConfig); }
    );

    doConfig();
  }
  RED.nodes.registerType("wlmio-6050", WLMIO6050);


  function WLMIO6060(config)
  {
    RED.nodes.createNode(this, config);
    const node = this;
    const id = parseInt(config.nid);
    const channel = parseInt(config.channel);
    const mode = parseInt(config.mode);
    const bias = parseInt(config.bias);
    const polarity = parseInt(config.polarity);

    node.on("input", function(msg, send, done)
      {
        const ni = wlmioNodes[id];
        if(!ni.status)
        {
          done("Missing module");
          return;
        }
        else if(ni.info == undefined)
        { return; }
        else if(ni.info == null || ni.info.name != "com.widgetlords.mio.6060")
        {
          done("Incorrect module installed");
          return;
        }

        const buffer = wlmiojs.packRegisterAccess(0, null);
        const reg = "ch" + channel + ".input";
        const r = wlmiojs.registerAccess(id, reg, buffer, function(r, b)
          {
            if(r < 0)
            { done("Error communicating with module"); }
            else
            { 
              const result = wlmiojs.unpackRegisterAccess(b);
              if(result.type != 9)
              { done("Error communicating with module"); }
              else
              {
                msg.payload = result.value[0];
                send(msg);
                done();
              }
            }
          }
        );
        if(r < 0)
        { done("Error communicating with module"); }
      }
    );

    function doConfig()
    {
      let buffer = wlmiojs.packRegisterAccess(11, [ mode ]);
      let reg = "ch" + channel + ".mode";
      wlmiojs.registerAccess(id, reg, buffer, function(r, b)
        {
          if(r < 0)
          { 
            node.error("Failed to configure channel");
            return;
          }
        }
      );

      buffer = wlmiojs.packRegisterAccess(11, [ bias ]);
      reg = "ch" + channel + ".bias";
      wlmiojs.registerAccess(id, reg, buffer, function(r, b)
        {
          if(r < 0)
          {
            node.error("Failed to configure channel");
            return;
          }
        }
      );

      buffer = wlmiojs.packRegisterAccess(11, [ polarity ]);
      reg = "ch" + channel + ".polarity";
      wlmiojs.registerAccess(id, reg, buffer, function(r, b)
        {
          if(r < 0)
          {
            node.error("Failed to configure channel");
            return;
          }
        }
      );
    }
    registerCallback(id, doConfig);

    node.on("close", function()
      { deregisterCallback(id, doConfig); }
    );

    doConfig();
  }
  RED.nodes.registerType("wlmio-6060", WLMIO6060);


  function WLMIO6070(config)
  {
    RED.nodes.createNode(this, config);
    const node = this;
    const id = parseInt(config.nid);
    const channel = parseInt(config.channel);

    node.on("input", function(msg, send, done)
      {
        const ni = wlmioNodes[id];
        if(!ni.status)
        {
          done("Missing module");
          return;
        }
        else if(ni.info == undefined)
        { return; }
        else if(ni.info == null || ni.info.name != "com.widgetlords.mio.6070")
        {
          done("Incorrect module installed");
          return;
        }

        const buffer = wlmiojs.packRegisterAccess(10, [ msg.payload ]);
        const reg = "ch" + channel + ".output";
        const r = wlmiojs.registerAccess(id, reg, buffer, function(r, b)
          {
            if(r < 0)
            { done("Error communicating with module"); }
            else
            { done(); }
          }
        );
        if(r < 0)
        { done("Error communicating with module"); }
      }
    );
  }
  RED.nodes.registerType("wlmio-6070", WLMIO6070);


  function WLMIO6080(config)
  {
    RED.nodes.createNode(this, config);
    const node = this;
    const id = parseInt(config.nid);
    const channel = parseInt(config.channel);
    const beta = parseInt(config.beta);
    const t0 = parseInt(config.t0);

    node.on("input", function(msg, send, done)
      {
        const ni = wlmioNodes[id];
        if(!ni.status)
        {
          done("Missing module");
          return;
        }
        else if(ni.info == undefined)
        { return; }
        else if(ni.info == null || ni.info.name != "com.widgetlords.mio.6080")
        {
          done("Incorrect module installed");
          return;
        }

        const buffer = wlmiojs.packRegisterAccess(0, null);
        const reg = "ch" + channel + ".input";
        const r = wlmiojs.registerAccess(id, reg, buffer, function(r, b)
          {
            if(r < 0)
            { done("Error communicating with module"); }
            else
            { 
              const result = wlmiojs.unpackRegisterAccess(b);
              if(result.type != 10)
              { done("Error communicating with module"); }
              else
              {
                msg.payload = result.value[0];
                send(msg);
                done();
              }
            }
          }
        );
        if(r < 0)
        { done("Error communicating with module"); }
      }
    );

    function doConfig()
    {
      let buffer = wlmiojs.packRegisterAccess(11, [ 1 ]);
      let reg = "ch" + channel + ".enabled";
      wlmiojs.registerAccess(id, reg, buffer, function(r, b)
        {
          if(r < 0)
          { 
            node.error("Failed to configure channel");
            return;
          }
        }
      );

      buffer = wlmiojs.packRegisterAccess(10, [ beta ]);
      reg = "ch" + channel + ".beta";
      wlmiojs.registerAccess(id, reg, buffer, function(r, b)
        {
          if(r < 0)
          {
            node.error("Failed to configure channel");
            return;
          }
        }
      );

      buffer = wlmiojs.packRegisterAccess(10, [ t0 ]);
      reg = "ch" + channel + ".t0";
      wlmiojs.registerAccess(id, reg, buffer, function(r, b)
        {
          if(r < 0)
          {
            node.error("Failed to configure channel");
            return;
          }
        }
      );
    }
    registerCallback(id, doConfig);

    node.on("close", function()
      {
        const buffer = wlmiojs.packRegisterAccess(11, [ 0 ]);
        const reg = "ch" + channel + ".enabled";
        wlmiojs.registerAccess(id, reg, buffer, function(r, b) {});

        deregisterCallback(id, doConfig);
      }
    );

    doConfig();
  }
  RED.nodes.registerType("wlmio-6080", WLMIO6080);


  function WLMIO6090(config)
  {
    RED.nodes.createNode(this, config);
    const node = this;
    const id = parseInt(config.nid);
    const channel = parseInt(config.channel);
    const mode = parseInt(config.mode);

    node.on("input", function(msg, send, done)
      {
        const ni = wlmioNodes[id];
        if(!ni.status)
        {
          done("Missing module");
          return;
        }
        else if(ni.info == undefined)
        { return; }
        else if(ni.info == null || ni.info.name != "com.widgetlords.mio.6090")
        {
          done("Incorrect module installed");
          return;
        }

        const buffer = wlmiojs.packRegisterAccess(0, null);
        const reg = channel <= 6 ? "ch" + channel + ".input" : "t" + (channel - 6);
        //done(reg);
        //return;
        const r = wlmiojs.registerAccess(id, reg, buffer, function(r, b)
          {
            if(r < 0)
            { done("Error communicating with module"); }
            else
            { 
              const result = wlmiojs.unpackRegisterAccess(b);
              if(result.type != 9 && result.type != 10)
              { done("Error communicating with module"); }
              else
              {
                msg.payload = result.value[0];
                send(msg);
                done();
              }
            }
          }
        );
        if(r < 0)
        { done("Error communicating with module"); }
      }
    );

    function doConfig()
    {
      if(channel > 6)
      { return; }

      let buffer = wlmiojs.packRegisterAccess(11, [ mode ]);
      let reg = "ch" + channel + ".type";
      wlmiojs.registerAccess(id, reg, buffer, function(r, b)
        {
          if(r < 0)
          { 
            node.error("Failed to configure channel");
            return;
          }
        }
      );
    }
    registerCallback(id, doConfig);

    node.on("close", function()
      {
        if(channel <= 6)
        {
          const buffer = wlmiojs.packRegisterAccess(11, [ 0 ]);
          const reg = "ch" + channel + ".type";
          wlmiojs.registerAccess(id, reg, buffer, function(r, b) {});
        }

        deregisterCallback(id, doConfig);
      }
    );

    doConfig();
  }
  RED.nodes.registerType("wlmio-6090", WLMIO6090);
};

