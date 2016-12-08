var fs=require('fs');
var path=require('path');

var loopId=1;
var codeFunctions={
	'set (.*?) (.*?)':function(ctx,variable,val){
		ctx.addReferences(variable);
		ctx.addCode(variable+'='+val+';\n');
	},
	'each (.*?) in (.*?)':function(ctx,variable,collection){
		ctx.open('each',{loopId:loopId,collection:collection});
		ctx.addReferences(collection);
		ctx.addCode('function __loop'+loopId+'('+variable+',loop){\n');
		ctx.initData();
		loopId++;
	},
	'endeach':function(ctx){
		ctx.endData();
		var frame=ctx.getFrame();
		ctx.addCode('if('+frame.collection+' instanceof Array){\n');
		ctx.addCode('  for(var __i=0;__i<'+frame.collection+'.length;__i++){\n');
		ctx.addValue('__loop'+frame.loopId+'('+frame.collection+'[__i],{index:__i,index1:__i+1,first:__i===0,last:__i==='+frame.collection+'.length-1})');
		ctx.addCode('  }\n');
		ctx.addCode('}else{\n');
		ctx.addCode('  var __i=0;\n');
		ctx.addCode('  for(var __key in '+frame.collection+'){\n');
		ctx.addValue('__loop'+frame.loopId+'('+frame.collection+'[__key],{index:__i,index1:__i+1,key:__key})');
		ctx.addCode('    __i++;\n');
		ctx.addCode('  }\n');
		ctx.addCode('}\n');
		ctx.close('each');
	},
	'loop (.*?) (.*?) to (.*?)':function(ctx,variable,start,stop){
		ctx.open('loop');
		var code='for(var '+variable+'='+start+';'+variable+'<='+stop+';'+variable+'++){\n';
		code+='  var loop={index:'+variable+'};\n';
		ctx.addCode(code);
	},
	'endloop':function(ctx){ctx.addCode('}\n');ctx.close('loop');},
	'if (.*?)':function(ctx,condition){
		ctx.open('if');
		ctx.addReferences(condition);
		ctx.addCode('if('+condition+'){\n');
	},
	'elseif (.*?)':function(ctx,condition){
		ctx.addReferences(condition);
		ctx.addCode('}\nelse if('+condition+'){\n');
	},
	'else':function(ctx){ctx.addCode('}\nelse{\n');},
	'endif':function(ctx){ctx.addCode('}\n');ctx.close('if');},
	'with \"(.*?)\"':function(ctx,filename){
		var fullPath=ctx.resolve(filename);
		var fileData=fs.readFileSync(fullPath).toString();
		var bq=new Backquote(mergeHashes(ctx.bqOptions,{basePath:path.dirname(fullPath)}));
		var subCtx=bq.compileCore(fileData,new Context(bq.options));
		ctx.open('with',{blocks:subCtx.getBlocks()});
		for(var r=0;r<subCtx.references.length;r++){
			ctx.addReferences(subCtx.references[r]);
		}
		ctx.addCode(subCtx.getFunc());
		ctx.pushState();
	},
	'endwith':function(ctx){
		var oldFrame=ctx.close('with');
		var blocks=ctx.getBlocks();
		var combinedBlocks=[];
		for(var b=0;b<oldFrame.blocks.length;b++){
			var superBlock=oldFrame.blocks[b];
			var overrideBlock=null;
			for(var b2=0;b2<blocks.length;b2++){
				if(blocks[b2].name===superBlock.name){
					overrideBlock=blocks[b2];
					break;
				}
			}
			if(overrideBlock!==null){
				combinedBlocks.push({name:overrideBlock.name,code:'function(){return ('+overrideBlock.code+')('+superBlock.code+');\n}'});
			}
			else combinedBlocks.push(superBlock);
		}
		var savedReferences=ctx.references.slice(0);
		ctx.popState();
		//popstate discards everything that has not been explicitly transfered, so add back the references that might have come from overriding blocks
		for(var r=0;r<savedReferences.length;r++)ctx.addReferences(savedReferences[r]);
		ctx.close('with'); //close it again since we just popped a previous state where is was still open
		for(var cb=0;cb<combinedBlocks.length;cb++)ctx.addBlock(combinedBlocks[cb]);
	},
	'block (.*?)':function(ctx,name){
		ctx.open('block',{name:name});
		ctx.addValue('__blocks.'+name+'()');
		ctx.startBuffering();
		var code='function(__super){\n';
		ctx.addCode(code);
		ctx.initData();
	},
	'endblock':function(ctx){
		ctx.endData();
		var buf=ctx.endBuffering();
		var oldFrame=ctx.close('block');
		ctx.addBlock({name:oldFrame.name,code:buf});
	},
	'super':function(ctx){
		ctx.addValue('__super()');
	},
	'macro ([^\\(]*)\\(([^\\)]*?)\\)':function(ctx,name,parms){
		ctx.open('macro',{name:name,parms:parms});

		//NOTE: this is tricky stuff. The macro sourcecode needs to be reusable in two different usecases.
		//  In the case where the macro is imported the sourcecode needs to be of the form "name=value"
		//  so it can be attached to the imported namespace through "namespace."+macrosource. On the other
		//  hand in the normal case the variable needs to be declared so it wont clobber the global
		//  namespace - this is done by adding the reference, as then the variable will be declared in the
		//  prologue outside of the macro sourcecode.
		ctx.addReferences(name);

		var code=name+'=function('+parms+'){\n';
		ctx.addCode(code);
		ctx.initData();
	},
	'endmacro':function(ctx){
		ctx.endData();
		ctx.close('macro');
	},
	'wrap ([^\\(]*)\\(([^\\)]*?)\\)':function(ctx,macroName,parms){
		ctx.open('wrap',{macroName:macroName,parms:parms,buffers:[]});
		ctx.pushState();
		ctx.initData();
	},
	'wrapnext':function(ctx){
		ctx.endData();
		var diff=ctx.popState();
		for(var b=0;b<diff.blocks.length;b++)ctx.addBlock(diff.blocks[b]);	
		for(var r=0;r<diff.references.length;r++)ctx.addReferences(diff.references[r]);	
		var buf=diff.func;
		var frame=ctx.close('wrap');
		frame.buffers.push(buf);
		ctx.open('wrap',frame);
		ctx.pushState();
		ctx.initData();
	},
	'endwrap':function(ctx){
		ctx.endData();
		var diff=ctx.popState();
		for(var b=0;b<diff.blocks.length;b++)ctx.addBlock(diff.blocks[b]);	
		for(var r=0;r<diff.references.length;r++)ctx.addReferences(diff.references[r]);	
		var buf=diff.func;
		var oldFrame=ctx.close('wrap');
		oldFrame.buffers.push(buf);
		var parms=oldFrame.parms;
		if(parms.length>0)parms=','+parms;
		var code=oldFrame.macroName+'(';
		for(var b=0;b<oldFrame.buffers.length;b++){
			if(b>0)code+=',';
			code+='(function(){\n'+oldFrame.buffers[b]+')()\n';
		}
		code+=parms+')';
		ctx.addValue(code);
	},
	'import "(.*?)" as (.*?)':function(ctx,filename,namespace){
		var fullPath=ctx.resolve(filename);
		var fileData=fs.readFileSync(fullPath).toString();
		var bq=new Backquote();

		var macros=[];
		var func=bq.compile(fileData,{basePath:path.dirname(fullPath),contextHook:function(subCtx,action,name,frame){
			if(name==='macro'){
				if(action==='open')subCtx.pushState();
				else if(action==='close'){
					var diff=subCtx.popState();
					macros.push(namespace+'.'+diff.func);
					ctx.addReferences(diff.references.join(' '));
				}
			}
		}});
		ctx.addCode('var '+namespace+'={}\n'+macros.join('\n'));
	}
};
//massage code patterns into proper (ugly) regex
var codePatterns=[];
for(var codePattern in codeFunctions){
	var rePattern='^\\s*'+codePattern+'\\s*$';
	codePatterns.push({str:codePattern,re:new RegExp(rePattern),func:codeFunctions[codePattern]});
};

function compileTag(ctx,tag){
	for(var p=0;p<codePatterns.length;p++){
		var pattern=codePatterns[p];
		var matched=tag.match(pattern.re);
		if(matched!==null){
			var args=[ctx].concat(matched.slice(1));
			var code=pattern.func.apply(null,args);
			return;
		}
	}

	//unrecognized tag
	throw new Error('Does not know how to act on :'+tag);
}


var Context=function(bqOptions){
	this.states=[];
	this.references=[];
	this.stack=[];
	this.importPaths=bqOptions.importPaths.concat([bqOptions.basePath]);
	this.hook=null;
	this.func='';
	this.shouldBuffer=false;
	this.buffer='';
	this.blocks=[];
	this.bqOptions=bqOptions;
}

Context.prototype.pushState=function(){
	this.states.push({references:this.references.slice(0),
					  stack:this.stack.slice(0),
					  importPaths:this.importPaths.slice(0),
					  hook:this.hook,
					  func:this.func,
					  shouldBuffer:this.shouldBuffer,
					  buffer:this.buffer,
					  blocks:this.blocks.slice(0)});
}

Context.prototype.popState=function(){
	var oldState=this.states.pop();
	var diffFunc=this.func.substr(oldState.func.length);
	var diffReferences=this.references.slice(oldState.references.length);
	var diffBlocks=this.blocks.slice(oldState.blocks.length);
	this.references=oldState.references;
	this.stack=oldState.stack;
	this.importPaths=oldState.importPaths;
	this.hook=oldState.hook;
	this.func=oldState.func;
	this.shouldBuffer=oldState.shouldBuffer;
	this.buffer=oldState.buffer;
	this.blocks=oldState.blocks;
	
	//return diff of oldstate with new state
	return {func:diffFunc,references:diffReferences,blocks:diffBlocks};
}

Context.prototype.clear=function(){this.func='';}
Context.prototype.getFunc=function(){return this.func;}

Context.prototype.startBuffering=function(){
	if(this.shouldBuffer){
		throw new Error('Nesting buffering sections not allowed');
	}
	this.shouldBuffer=true;
}
Context.prototype.endBuffering=function(){this.shouldBuffer=false;var b=this.buffer;this.buffer='';return b;}

Context.prototype.getBlocks=function(){return this.blocks;}

Context.prototype.initData=function(){
	this.addCode('var __str="";\n');
}

Context.prototype.endData=function(){
	this.addCode('return __str;\n}\n');
}

Context.prototype.dataVar=function(){
	return '__str';
}

Context.prototype.addData=function(text){
	if(text.length<=0)return;
	text=text.replace(/\\/g,'\\\\');
	text=text.replace(/\r/g,'');
	text=text.replace(/\n/g,'\\n').replace(/\"/g,'\\"');
	this.addCode('__str+="'+text+'";\n');
}

Context.prototype.addValue=function(val){
	this.addCode('__str+='+val+';\n');
}

Context.prototype.valueStart=function(val){
	this.addCode('__str+='+val);
}

Context.prototype.addCode=function(code){
	if(this.shouldBuffer)this.buffer+=code;
	else this.func+=code;
}

Context.prototype.addBlock=function(block){
	this.blocks.push(block);
}

Context.prototype.setHook=function(hook){
	this.hook=hook;
}

Context.prototype.resolve=function(filename){
	var fullPath=filename;
	for(var p=0;p<this.importPaths.length;p++){
		var full=path.resolve(this.importPaths[p],filename);
		if(fs.existsSync(full)){
			fullPath=full;
			break;
		}
	}
	return fullPath;
}


function isNumber(o){
  return ! isNaN (o-0) && o !== null && o !== "" && o !== false;
}

Context.prototype.addReferences=function(str){
	var noOperators=str.replace(/[^\w\s.]/g,' ');
	var parts=noOperators.split(' ');
	for(var p=0;p<parts.length;p++){
		var part=parts[p];
		part=part.replace(/\s/g,'');
		if(part.indexOf('.')>=0)part=part.split('.')[0];
		if(part.length<=0)continue;
		if(isNumber(part))continue;
		if(part==='JSON')continue;//dont shadow JSON
		if(part==='true' || part==='false')continue;//dont shadow true and false
		var found=false;
		for(var r=0;r<this.references.length;r++){
			if(this.references[r]===part){
				found=true;
				break;
			}
		}
		if(!found) this.references.push(part);
	}
}

Context.prototype.curName=function(){
	if(this.stack.length>0)return this.stack[this.stack.length-1].frameName;
}

Context.prototype.open=function(name,parms){
	var frame={frameName:name};
	if(parms===undefined)parms={};
	for(var p in parms){frame[p]=parms[p];}
	if(this.hook!==null)this.hook(this,'open',name,frame);
	this.stack.push(frame);
}

Context.prototype.getFrame=function(){
	if(this.stack.length<=0)return null;
	return this.stack[this.stack.length-1];
}

Context.prototype.close=function(name){
	var curName=this.curName();
	var oldFrame=this.stack.pop();
	if(curName!==name)throw new Error('unbalanced section, '+curName+' was open, but trying to close '+name);
	if(this.hook!==null)this.hook(this,'close',name,oldFrame);
	return oldFrame;
}

Context.prototype.isOpen=function(){
	return this.stack.length>0;
}

function mergeHashes(hasha,hashb){
	if(hashb===undefined)return hasha;
	var merged={};
	for(var keya in hasha)merged[keya]=hasha[keya];
	for(var keyb in hashb)merged[keyb]=hashb[keyb];
	return merged;
}

var Backquote=module.exports=function(options){
	this.options=options || {};
	if(this.options.importPaths===undefined)this.options.importPaths=[];
}

Backquote.prototype.compileCore=function(template,ctx,options){
	var stTEXT='TEXT';
	var stTAG='TAG';
	var stVAL='VAL';
	var chCURLY='{';
	var chCURLY2='}';
	var chSECOND='%';
	var chVAL='#';
	var state=stTEXT;
	var text='';
	var tag='';
	var val='';
	options=mergeHashes(this.options,options);
	if(options.contextHook!==undefined)ctx.setHook(options.contextHook);
	for(var i=0;i<template.length;i++){
		var c=template.charAt(i);
		switch(state){
		case stTEXT:
			if(c===chCURLY){
				var nextC=template.charAt(i+1);
				if(nextC===chSECOND){
					state=stTAG;
					i++;
					ctx.addData(text);
					tag='';
					continue;
				}
				else if(nextC===chVAL){
					state=stVAL;
					i++;
					ctx.addData(text);
					val='';
					continue;					
				}
			}
			text+=c;
			break;
		case stTAG:
			if(c===chSECOND){
				var nextC=template.charAt(i+1);
				if(nextC===chCURLY2){
					state=stTEXT;
					i++;
					text='';
					compileTag(ctx,tag);
					continue;
				}
			}
			tag+=c;
			break;
		case stVAL:
			if(c===chVAL){
				var nextC=template.charAt(i+1);
				if(nextC===chCURLY2){
					state=stTEXT;
					i++;
					text='';
					ctx.addReferences(val);
					ctx.addCode('var __tmp=('+val+');\n');
					ctx.addValue('(__tmp!==undefined ? __tmp : "")');
					continue;
				}
			}
			val+=c;
			break;
		}
	}
	ctx.addData(text);

	if(ctx.isOpen())throw new Error('missing end for tag '+ctx.curName());

	return ctx;
}


Backquote.prototype.compile=function(template,options){
	options=mergeHashes(this.options,options);

	var ctx=new Context(options);
	this.compileCore(template,ctx,options);

	var compiled=ctx.getFunc();
	ctx.clear(); // we are starting over to prefix header

	ctx.addCode('if(__dict===undefined)__dict={};\n');

	for(var r=0;r<ctx.references.length;r++){
		var ref=ctx.references[r];
		ctx.addCode('var '+ref+'=__dict["'+ref+'"];\n');
	}

	ctx.initData();
	var blocks=ctx.getBlocks();
	if(blocks.length>0){
		ctx.addCode('var __blocks={\n');
		ctx.addCode(blocks.map(function(block){
			return block.name+':'+block.code+'\n';
		}).join());
		ctx.addCode('}\n');
	}

	//header done, add back the previously compiled
	ctx.addCode(compiled);

	//now the footer
	ctx.addCode('return __str;\n');

	var func=ctx.getFunc();

	var compiled=new Function('__dict',func);
	compiled.code=func;
	return compiled;
}

Backquote.prototype.addImportPath=function(path){
	this.options.importPaths=this.options.importPaths.concat([path]);
}

Backquote.prototype.renderFile=function(fullPath,parameters,options){
	var fileData=fs.readFileSync(fullPath).toString();
	options=mergeHashes(this.options,options);
	options=mergeHashes(options,{basePath:path.dirname(fullPath)});
	var func=this.compile(fileData,options);
	if(parameters===undefined)parameters={};
	parameters.templatefile=path.basename(fullPath);
	return func(parameters);
}

//Express JS wrapper
Backquote.prototype.expressEngine=function(){
	var self=this;
	return function(fullPath,parameters,callback){
		var bq=new Backquote(self.options);//express.js obscures "this" pointer :(
		var rendered=bq.renderFile(fullPath,parameters);
		callback(null,rendered);
	};
}
