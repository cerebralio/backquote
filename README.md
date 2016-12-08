Backquote
=====

Backquote is a templating library designed to be flexible, concise and powerful.

It does not HTML-escape parameters by default and it allows you to execute arbitrary Javascript in your templates - so if you need to use it in an unsafe environment you will need to wrap it in a sanitizer filter.

Features
-----
Some of the features supported
   * All basic logic needed
   * Reuse through macros and inheritance
   * Integrates well with Javascript
   * Configurable include-paths
   * Both functional and OOP approaches supported
   * Pretty good performance
   * Built-in Express.js support

Philosophy
-----
A templating library is basically a tool for inverting the data/code duality (data inside code versus code inside data). It needs to do two things well :
  1. take a piece of data (such as a string) and recognize all parts
that are actually code.
  2. invert the logic so that instead of data with some code, you have code with some data. After this invertion has been done, all you have to do is invoke the code to produce the expected data.

This duality is also at the heart of the power that programming in Lisp provides. You have the quote/unquote mechanisms and quasiquote is basically a templating engine. This is also where Backquote gets its name.

Installation
-----
Use npm: 

    npm install backquote

Usage
-----
To delimit the code from the data, Backquote uses two sets of escape-tags. The difference is that one set is for expressing code-logic such as conditionals or iteration and the other is for outputting values.

Outputting values is through the `{#` and `#}` set of code-escape-tags.
```html
<title>{# title #}</title>
```
This assumes that `title` is part of the parameters sent to the template-function.

Code-logic instead uses the `{%` and `%}` set of variable-escape-tags.
```html
{% if loggedIn %}
<a href="logout();">Logout</a>
{% else %}
<a href="login();">Login</a>
{% endif %}
```

To use a template the process is to compile the template first to get a function. Calling that function with parameters will then produce the output.

```javascript
var Backquote=require('backquote');
var bq=new Backquote();
var tpl='habla {# language #}?';
var renderTpl=bq.compile(tpl);
renderTpl({language:'espanol'}); //produces "habla espanol?"
```

Supported Tags
-----

### If
An if tag takes an arbitrary conditional statement and outputs the data within the tag if evaluated to true. You can
use `else` and `elseif`. You must remember to close the tag with `endif`

```
{% if habla %}
  espanol!
{% elseif prata %}
  svenska!
{% else %}
  no habla
{% endif %}
```

### Set
The set tag is used to set a named variable to a value. This can sometimes be necessary to avoid repeated code.

```
{% set habla true %}
{% if habla %}espanol!{% endif %}
```
will always output "espanol!"

### Each
The each tag is used to repeat some data for all the items in an array or all the keys in an object.

You can decide the name for each item and use that to reference it within the tag.
Assuming the parameter alphabet is provided to the compiled function, this will print the alphabet:
```
{% each character in alphabet %}{# character #}\n{% endeach %}
```
Within the each tag you also have access to certain special variables.

  * loop.index - the 0-base index into the array or object.
  * loop.index1 - the 1-base index into the array or object.
  * loop.first - true if this is the first item in an array.
  * loop.last - true if this is the last item in an array.
  * loop.key - the current key (only for objects).

### Loop
The loop tag is similar to the each tag but allows you to control the index-value yourself.

```
{% loop a 1 to 8 %}loop{% endloop %}
```
Will print "loop" 8 times (both start and stop value is included.

Similarly to the each tag you have access to `loop.index` and `loop.index1` within the loop body.

### Macro
A macro is like a function declaration. It is a piece of template that you want to reuse in several places. They can receive parameters just like normal functions.

```
{% macro habla(language) %}
habla {# language #}?
{% endmacro %}

{# habla("espanol") #}
```
Will produce "habla espanol?".


### Import
Macros are especially nice when you collect your best ones into a library of macros to be reused across your projects. To get access to these reusable pieces you use the import tag to import them into the template where you need them.

Assuming you have a "head.bq" file with a "style" macro for creating style tags :
```html
{% import "head.bq" as head %}
<head>
{# head.style("main") #}
</head>
```
could produce the proper head-tag you want :
```html
<head>
<link rel="stylesheet" type="text/css" href="main.css" />
</head>
```

### Wrap
Reusing macros is important for maintainability, for example some parts of your pages will be
the same across one or more sites. Sometimes though, the part that you want to reuse is not a
snippet of code within the page but rather the layout of the page or part of the page. Reusing
layout is tricky because then you have the specifics _within_ the general, not the other way
around. While you can use the `with` tag for such usecases (see below), the wrap tag is a strictly
low level functional approach whereas the with tag is more object oriented (another way to describe
it is that `wrap` is used as a _library_ whereas `with` creates a _framework_).

The `wrap` tag builds on the macro support by giving you some syntactic sugar that allows you to
write macros that take the internal content of the `wrap` block as the first parameter,
and structure it in the template in a natural way. This is easier to show than to describe, so
here is a short example of a reuseable head-tag macro:

```html
{% macro head(title,level) %}
<h{# level #}>{# title #}</h{# level #}>
{% endmacro %}
```

This can then later be used over and over everywhere you want a head-tag of some size (the title
parameter will be automatically filled in, so only the level parameter is needed) :

```html
{% wrap head(3) %}
hello world!
{% endwrap %}
```

Which would produce `<h3>hello world!</h3>` (though with some newlines). For this example it is
easier to just write the head tag directly but you can probably imagine how this could be useful
to reuse some special 3-column fluid layout for instance.

Another reason for using this technique, is that you can use it when you are uncertain exactly
how a part of the template will end up - this allows you to encapsulate how you do head-tags
for example, in a way that you can change in a single location later.


### Wrapnext
In the case of reusing a multicolumn html layout, it is usually not good enough to be able to
wrap a single piece of content and use that in a macro - you need to be able to provide the content
for all the parts of the layout. You can use the wrapnext tag to separate multiple pieces of content
and they will be provided to the macro as the first parameters.

example :
```html
{% macro anchor(url,text) %}
<a href="{# url #}">{# text #}</a>
{% endmacro %}
```

and then for using it :

```html
{% wrap anchor() %}http://google.com{% wrapnext %}search{% endwrap %}
```

which produces `<a href="http://google.com">search</a>`.



### With
The `with` tag is for inheritance between template-files. You use it together with the block tag to delimit
parts of the parent template that you want to override in the child-template. Compared to using macros and
the wrap tag, this is a higher level approach that uses files as the basic unit and allows overriding.
You can also combine them - a typical thing to do is to use inheritance for reusing a general html structure
with doctype, head section, body section, etc. but then reusing the page layout through a wrapped macro that
you have imported from a standard macro library.

So given you have a template file with this content
```
->{% block test %}habla espanol?{% endblock %}
```
and you reference that as "parent.bq" in another template
```
{% with "parent.bq" %}
{% block test %}habla svenska?{% endblock %}
{% endwith %}
```
it will produce "->habla svenska?" as the test-block in the child will override the parent block but you still get the "->" part from the parent.

If you want to output the output of the overrided block you can reference it with the super tag :

```
{% with "parent.bq" %}
{% block test %}
{% super %}<-
{% endblock %}
{% endwith %}
```
will produce "->habla espanol?<-".

Remember to always close the with tag with `endwith`. This actually allows you to do multiple parts in your template that inherits from different parent templates, the parent template is not global.


Integration With Express.js
-----
To facilitate easy usage from Express, an instance of Backquote provides you with the `expressEngine` method.

```javascript
app.engine('.html',bq.expressEngine());
```
This tells Express to use Backquote for rendering your views, simple as that.


Details to Note
-----
### Escaping HTML
Backquote has been designed as a general templating library and as such is not limited to rendering HTML templates.
This also means that there is no HTML escaping by default. When you need to escape HTML the recommended method
is to use the [escape-html](https://www.npmjs.com/package/escape-html) package (which is what express.js uses)
and pass that as a parameter to the template.

```javascript
var escape=require('escape-html');
var Backquote=require('backquote');
var bq=new Backquote();

…

var renderTpl=bq.compile(template);
renderTpl({escape: escape, comments: comments});
```

then in the template you can simply write:

```html
{% each comment in comments %}
<div class="comment">{# escape(comment) #}</div>
{% endeach %}
```

### Whitespace
Within templates no whitespace is ignored. This allows you to control whether you want newlines or not. So
```
{% if present %}yes!{% endif %}
```
will not contain newlines but 
```
{% if present %}
yes!
{% endif %}
```
will contain 2.

### Undefined Variables
When using variable-escape-tags it will be silently ignored if the variable is undefined. However this is not the
case if the variable is referenced in an object that is itself undefined. So assuming that `title` is undefined:
```html
<title>{# title #}</title>
```
will output an empty tag, but :
```html
<title>{# title.toUpperCase() #}</title>
```
will fail. This reflects how Javascript works.

### Arbitrary Code
While Backquote allows you use arbitrary code in certain places, it also needs to parse that to be able know which
variables you reference. This is to allow you the convenience of writing `{# title #}` instead of being required
to always reference a parameters object such as in `{# __parms.title #}`. Backquote has been tested in real scenarios
but keep in mind that if you do exceedingly tricky stuff it will probably fail to gather the right references.

If it fails let me know though, and I will try to fix it.

