var Backquote=require('../backquote');
var assert=require('assert');

describe('If Tag',function(){
	var bq=new Backquote();

	it('should include when true',function(){
		var tpl='{% if habla %}espanol!{% endif %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({habla:true}),'espanol!');
	});

	it('should exclude when false',function(){
		var tpl='{% if habla %}espanol!{% endif %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({habla:false}),'');
	});

	it('should allow else',function(){
		var tpl='{% if habla %}espanol!{% else %}no habla{% endif %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({habla:false}),'no habla');
	});

	it('should allow elseif',function(){
		var tpl='{% if habla %}espanol!{% elseif prata %}svenska!{% else %}no habla{% endif %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({habla:false,prata:true}),'svenska!');
	});

});
