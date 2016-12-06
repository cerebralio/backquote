var Backquote=require('../backquote');
var assert=require('assert');

describe('Loop Tag',function(){
	var bq=new Backquote();

	it('should be able to repeat a number of times',function(){
		var tpl='{% loop a 1 to 8 %}loop{% endloop %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl(),'looplooplooplooplooplooplooploop');
	});

	it('should have loop index',function(){
		var tpl='{% loop a 1 to 8 %}a={# loop.index #}\n{% endloop %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl(),'a=1\na=2\na=3\na=4\na=5\na=6\na=7\na=8\n');
	});

});
