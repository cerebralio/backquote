var Backquote=require('../backquote');
var assert=require('assert');

describe('Macro Tag',function(){
	var bq=new Backquote();

	it('should be able to invoke',function(){
		var tpl='{% macro test() %}habla espanol?{% endmacro %}{# test() #}{# test() #}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl(),'habla espanol?habla espanol?');
	});

	it('should be able to use parameters',function(){
		var tpl='{% macro habla(language) %}habla {# language #}?{% endmacro %}{# habla("espanol") #}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl(),'habla espanol?');
	});

});
