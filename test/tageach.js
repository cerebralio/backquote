var Backquote=require('../backquote');
var assert=require('assert');

describe('Each Tag',function(){
	var bq=new Backquote();

	it('should be able to iterate an array',function(){
		var tpl='{% each character in alphabet %}{# character #}\n{% endeach %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({alphabet:['a','b','c']}),'a\nb\nc\n');
	});

	it('should be able to iterate an object',function(){
		var tpl='{% each value in item %}{# loop.index1 #}) {# loop.key #}:{# value #}\n{% endeach %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({item:{name:'Joe Schmoe',age:'38',likes:'beer, pussy and horn music'}}),'1) name:Joe Schmoe\n2) age:38\n3) likes:beer, pussy and horn music\n');
	});

	it('should have loop index',function(){
		var tpl='{% each character in alphabet %}{# character #}{# loop.index #}\n{% endeach %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({alphabet:['a','b','c']}),'a0\nb1\nc2\n');
	});

	it('should have loop index1',function(){
		var tpl='{% each character in alphabet %}{# character #}{# loop.index1 #}\n{% endeach %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({alphabet:['a','b','c']}),'a1\nb2\nc3\n');
	});

	it('should support first and last',function(){
		var tpl='{% each item in list %}{% if loop.first %}<ul>{% endif %}<li>{# item #}</li>{% if loop.last %}</ul>{% endif %}{% endeach %}';
		var renderTpl=bq.compile(tpl);
		assert.equal(renderTpl({list:['a','b','c']}),'<ul><li>a</li><li>b</li><li>c</li></ul>');
	});

});
