var Backquote=require('../backquote');
var assert=require('assert');

describe('compile',function(){
	var bq=new Backquote();

	it('should ignore missing var',function(){
		var tpl='habla {# missing #}espanol';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({}),'habla espanol');
	});

	it('should only evaluate var once',function(){
		var tpl='{# inc() #}{# inc() #}';
		var renderTpl=bq.compile(tpl);
		var counter=0;
		function inc(){
			counter++;
			return counter;
		}
		assert.equal(renderTpl({inc:inc}),'12');
	});

	it('should throw on unrecognized command',function(){
		var tpl='{% unknown %}';
		assert.throws(function(){bq.compile(tpl);});
	});

  it('should throw on command without end tag', function(){
		var tpl='{% if true %}';
		assert.throws(function(){bq.compile(tpl);});
  });

	it('should allow rendering file directly',function(){
		assert.equal(bq.renderFile(__dirname+'/tagwithhelper2.bq',{language:'svenska'}),'habla svenska?');
	});

	it('should have templatefile constant',function(){
		assert.equal(bq.renderFile(__dirname+'/templatefile.bq'),'templatefile.bq');
	});

	it('should strip <CR>',function(){
		var tpl='habla\r\nespanol';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({}),'habla\nespanol');
	});

	it('should allow adding import-paths',function(){
		var bq=new Backquote();
		bq.addImportPath(__dirname);
		var found=false;
		for(var i=0;i<bq.options.importPaths.length;i++){
			if(bq.options.importPaths[i]===__dirname)found=true;
		}
		assert.ok(found);
	});

	it('should have express engine api',function(done){
		var engine=bq.expressEngine();
		engine(__dirname+'/tagwithhelper2.bq',{language:'svenska'},function(err,rendered){
			assert.ifError(err);
			assert.equal(rendered,'habla svenska?');
			done();
		});
	});

});
