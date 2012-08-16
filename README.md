jquery-rest-admin
=================

A jQuery plugin providing an admin panel for any REST backend. Supports nested panels.

Here's an example with text, checkbox and single select controls. Note that we pass in an array of JSONified "type" objects as the choices for one of the single select dropdowns. We can do that, as long as we specify what the choiceLabel and choiceValue property names are:

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

Here's another example with another admin nested in the first, allowing every department to have an editable list of aliases:

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

Note that by default nested admins don't do their own REST requests. Instead the entire thing is serialized as part of the POST or PUT request for the parent object.

You can override LOTS of things. There are lots of things you can't override yet. TODO: document all that; implement more great stuff; present references for REST and an example REST controller that this plugin can talk to (it really doesn't matter though, if it speaks REST properly and responds with JSON).
