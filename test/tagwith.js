var Backquote=require('../backquote');
var assert=require('assert');

describe('With Tag',function(){
	var bq=new Backquote({basePath:__dirname});

	it('should be able to include from file',function(){
		var tpl='{% with "tagwithhelper.bq" %}{% endwith %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl(),'habla espanol?');
	});

	it('should pass through parameters to included template',function(){
		var tpl='{% with "tagwithhelper2.bq" %}{% endwith %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({language:'svenska'}),'habla svenska?');
	});

	it('should pass through importPaths to included template',function(){
		var tpl='{% with "tagwithhelper5.bq" %}{% endwith %}';
		var renderTpl=bq.compile(tpl,{importPaths:[__dirname+'/tagimportfolder']});
		assert.equal(renderTpl({language:'svenska'}),'\nhabla svenska?\n');
	});

	it('should allow overriding blocks',function(){
		var tpl='{% with "tagwithhelper3.bq" %}{% block test %}habla svenska?{% endblock %}{% endwith %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl(),'->habla svenska?');
	});

	it('should allow calling super',function(){
		var tpl='{% with "tagwithhelper4.bq" %}{% block test %}{% super %}<-{% endblock %}{% endwith %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl(),'->habla espanol?<-');
	});

	it('should have references to parameters in overriding blocks',function(){
		var tpl='{% with "tagwithhelper3.bq" %}{% block test %}habla {# language #}?{% endblock %}{% endwith %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({language:'svenska'}),'->habla svenska?');
	});

});
