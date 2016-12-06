var Backquote=require('../backquote');
var assert=require('assert');

describe('Import Tag',function(){
	var bq=new Backquote({basePath:__dirname});

	it('should be able to use macros from file',function(){
		var tpl='{% import "tagimporthelper.bq" as bar %}{# bar.test() #}{# bar.test2("svenska") #}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl(),'\nhabla espanol?\n\nhabla svenska?\n');
	});

	it('should allow imported macros to reference parameters',function(){
		var tpl='{% import "tagimporthelper2.bq" as bar %}{# bar.test() #}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({language:'svenska'}),'\nhabla svenska?\n');
	});

	it('should not clobber globals',function(){
		var tpl='{% import "tagimporthelper.bq" as bar %}{# bar.test() #}{# bar.test2("svenska") #}';
		var renderTpl=bq.compile(tpl);

		var code='var __test=(function(){\n'+renderTpl.code+'\n})();\nif(global["test"]!==undefined)throw new Error("clobbered");\nif(global["test2"]!==undefined)throw new Error("clobbered");\nreturn __test;\n';
		var func=new Function('__dict',code);

		assert.equal(func(),'\nhabla espanol?\n\nhabla svenska?\n');
	});
	

	it('should search additional import-paths',function(){
		var tpl='{% import "tagimportpathhelper.bq" as bar %}{# bar.test() #}{# bar.test2("svenska") #}';
		var renderTpl=bq.compile(tpl,{importPaths:[__dirname+'/tagimportfolder']});
		assert.equal(renderTpl(),'\nhabla espanol?\n\nhabla svenska?\n');
	});
});
