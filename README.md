jquery-rest-admin
=================

A jQuery plugin providing an admin panel for any REST backend. Supports nested panels.

Here's an example with text, checkbox and single select controls. This example manages all of the 'category' objects in the system by talking to a REST controller on the back end. [As long as that REST controller follows the REST conventions](http://microformats.org/wiki/rest/urls) and responds with a JSON representation of the object or array of objects, it will just work. 

(Of course, since this is a browser-side solution, your REST controller must check permissions and validate everything sent to it for possible malicious or out-of-bounds data, no matter how much browser-side validation has been done.)

Note that we pass in an array of JSONified "type" objects as the choices for one of the single select dropdowns. We can do that as long as we specify what the `choiceLabel` and `choiceValue` property names are. Another single select dropdown just has `label` and `value` properties for each option. These are the default values for `choiceLabel` and `choiceValue`. 

    $(function() {
      var types = [ { name: "Free", id: 1 }, { name: "Jobs", id: 2 } ];
      $('.categories').restAdmin({
        url: '/admin/categories',
        schema: [ 
          { 
            name: "name", 
            type: "text", 
            label: "Name",
            unique: true,
            required: true
          },
          { 
            name: "posters",
            type: "select",
            label: "Who Can Post?",
            choices: [ { label: "Everyone", value: "everyone" }, { label: "Admins", value: "admins" }],
            required: true
          },
          { 
            name: "type",
            type: "select",
            label: "Type",
            choices: types,
            choiceLabel: 'name',
            choiceValue: 'id',
            required: true
          },
          {
            name: "paid_option",
            type: "checkbox",
            label: "Paid"
          }
        ] 
      });
    });

Here's another example with another admin nested in the first, allowing every department to have an editable list of aliases. By default the nested admin does not carry out its own REST actions. 

There actually is a REST URL convention for nested objects:

    /admin/departments/5/aliases

But this would not work for adding aliases to a new department that has not been saved yet, and it adds more wait time to the system. So instead, the complete collection of objects created with the nested admin (the aliases for the department) is submitted as a single array parameter when the parent object (the department) is saved.

    $(function() {
      // Preloading the data is optional, it'll go get it via REST if you don't
      var items = [ { "name": "Biology", "id": 1 }, "name": "Chemistry", "id" 2 } ];
      $('.departments').restAdmin({
        data: items, 
        url: '/admin/departments', 
        sortable: true,
        container: '.departments', 
        schema: [ 
          { 
            name: "name", 
            type: "text", 
            label: "Name",
            required: true,
            unique: true
          },
          {
            name: "aliases",
            type: "admin",
            label: "Aliases",
            labelColumn: "name",
            options: {
              sortable: false,
              schema: [
                {
                  name: "name",
                  type: "text",
                  label: "Name",
                  required: true,
                  unique: true
                }
              ]
            }
          }
        ] 
      });
    });

Again, note that by default nested admins don't do their own REST requests. Instead the entire thing is serialized as an array parameter in the POST or PUT request for the parent object.

By default, jquery-rest-admin looks for a primary key in the id column of each object. You can change this by specifying an alternate column name with the "id" option.

What Does My Backend REST Controller Have To Do?
================================================

By default jquery-rest-admin retrieves, creates, updates and deletes objects via the REST URL that you specify. If your `url` option is set to `/admin/categories`, then the following methods and URLs will be accessed as needed:

`GET /admin/categories` should return a JSON array containing JSON objects representing every item. Items will be presented in the order returned (TODO: support browser side sorting). At some point `offset` and `limit` query parameters for server side pagination will be supported.

`POST /admin/categories` creates a new object by submitting a standard POST request with a value for each editable property of the object. Note that the request looks just like a normal POST form submission. If there are nested admins, by default their entire contents serialize as an array parameter in the parent admin's POST submission. It should return a JSON object representing the saved object on success. A checkbox that is checked submits the value 1. A checkbox that is not checked submits an empty string. This is a big improvement over the ambiguous "field not present at all" behavior of standard HTML checkboxes. It's very handy in both PHP and JavaScript, because both languages consider 1 true and an empty string false. Our apologies to Ruby developers who may have to explicitly check for an empty string, but you can't submit `false` or `nil` via a traditional urlencoded form, so there's not a lot more we can do to help.

`PUT /admin/categories/5` updates the object with the id 5. Otherwise it is identical to POST. It should return a JSON object representing the saved object on success.

`DELETE /admin/categories/5` deletes the object with the id 5. It should return a JSON object representing the deleted object on success.

`PUT /admin/categories/rank` submits a single array parameter called `order`, containing a list of the IDs of all items, in the order in which the user has just manually sorted them. This will never happen if `options.sortable` is not true. The response does not matter as long as the status code is successful.

Browser-Side Validation
=======================

We do a little. Soon we'll do more. Right now you can set `required: true` or `unique: true` for a column. If you set `required: true` that column can't be left blank. If you set `unique: true`, a new or updated object is not permitted to have the same value for that column as another object. Keep in mind this is based only on what is known to the admin. 

You can also set `deleteValidator`, which should be a function that takes three parameters:

    deleteValidator: function(datum, schema, name) { ... }

The first argument is the object to be deleted. The second argument is the schema object (options.schema). The third argument is the name of the column being validated.

If your deleteValidator returns true, the deletion is allowed to proceed. If the deleteValidator returns false, the deletion is blocked. 

Overriding The Storage Method
=============================

If you don't like the default REST storage implementation, you can override the following:

`options.loadData` should accept an `options` argument and retrieve all of the objects from the server (GET /admin/categories). Invoke `options.success` with the array of objects if all goes well. Invoke `options.error` if all does not go well.

`options.create` should accept a `datum` (an object to create) and an `options` argument. Invoke `options.success` with the returned object if all goes well. Invoke `options.error` if all does not go well.

`options.update` should accept a `datum` (an object to update) and an `options` argument. Invoke `options.success` with the updated object if all goes well. Invoke `options.error` if all does not go well.

`options.remove` should accept a `datum` (an object to remove) and an `options` argument. Invoke `options.success` with the removed object if all goes well. Invoke `options.error` if all does not go well.

`options.rank` should accept an `order` parameter (an array of IDs of objects, in the desired sorting order) and an `options` argument. Invoke `options.success` if all goes well. Invoke `options.error` if all does not go well.

"What if I just want to update an array of objects on the browser side and I don't care about storage in a backend somewhere?" Just set `options.local` to true and make sure you pass in the initial array of objects as `options.data`. Your `options.data` array will be updated in place, so that you can inspect it at any time and find the latest edits are present.

Adding and Customizing Types
============================

Right now the available column types are:

`text`, `textarea`, `richtext`, `checkbox`, `select` (single selection), `readOnly` (a text field that cannot be edited), and `admin`.

The `richtext` type is currently coded to rely on CKEditor. If you use it, you are responsible for loading ckeditor.js before you instantiate jqueryRestAdmin. The default toolbar is used (yes, it would be nice to pass on ckeditor configuration options, including the location of the custom configuration file - send us a pull request). 

Of course this is not enough for everyone (TODO: add `multiple` hurryupquick, based on `aMultipleSelect`).

Fortunately you can add your own types. This is what the `text` type would look like if it were not built in:

    var options = { ... the rest of the options I'm planning to pass to restAdmin... };
    options.types.text = { 
      listText: function(column, val) {
        return val;
      },
      control: function(column, val) {
        var e = $('<input type="text" data-role="control" />');
        e.val(val);
        return e;
      },
      defaultValue: ''
    });

The `listText` method must return a reasonable text representation of the current value of the control, for display in the list view (TODO: make displaying columns in the list view optional). The first argument is a column object, allowing you access to any properties that were set on this column. That is, if the schema includes a column like this:

{
    name: 'first_name',
    required: true
}

Then the `column` object has `name` and `required` properties that can be accessed from `listText`.

The `control` method returns a jQuery element which displays an editing control for your type. The column object is the first parameter and the current value is the second. 

If your type has an HTML element which can be interrogated with the regular jQuery `val()` function to get its current value, just make sure your `control` method applies a `data-role="control"` attribute to it so that jquery-rest-admin can locate that element. Alternatively, you can set `selfUpdating: true`, in which case your control is expected to directly update `val`. This is the right approach if the value of your column is a modifiable object. This feature is currently used for nested admins, but you may find it useful elsewhere. 

An alternative to `selfUpdating: true` is to define a `getValue` function for your type. This function receives the column definition as its first argument and the jQuery element for the control as second argument, and should return the appropriate value to submit. See the built-in implementation of the checkbox type for a good example, included because val() is not useful for checkboxes.

Finally, `defaultValue` establishes the default value for columns of this type if there is no default value for the column.

Note that you can override any part of the standard types' implementation via the options object, as well as adding new types.

Events
======

If your control does have an element that can be queried via `val()` but needs a nudge to update it when a save operation takes place, just bind the `jraUpdate` jQuery event on your control.

If your control needs to do part of its initialization after it is absolutely positively really added to the DOM of the page, bind the `jraAdded` jQuery event on your control.

If your application wishes to be informed whenever the list view is repopulated (which happens initially and whenever an edit is saved), bind the `jraRefreshedList` jQuery event on the container. Note that this event is posted once when the admin is initially populated (i.e. on the initial load of the page), so if you are thinking of triggering a page refresh on this event you should ignore the first one.

TODO
====

You can override a number of things not documented here. There are lots of things you can't override yet, in particular the markup, although it is pretty basic bootstrap-friendly markup and doesn't need a lot of overriding. We need a way to propagate server-side validation errors into the UI rather than just mysteriously ignoring a request to save or delete. TODO: document all that; implement more great stuff.
