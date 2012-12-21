// REST-powered admin for any table of data.
//
// var items = [ { name: 'foo' }, { name: 'baz'} ];
// aRestAdmin({
//   data: items,
//   url: '/admin/products',
//   sortable: true,
//   container: '.types',
//   schema: [
//     {
//       name: "name",
//       type: "text",
//       label: "Name"
//     }
//   ]
// });
//
// There are additional options as seen below.

(function( $ ){

  $.fn.restAdmin = function(options) {

    var container = this;

    // Primary key column name. There must be one to save and delete items.
    // It must be acceptable to append it to the URL like this: /123
    //
    // It must never conflict with reasonable action keywords like: /rank
    // (translation: slugs are inappropriate). You can get around this rule
    // if you override REST actions that add a keyword to the URL (see below)

    var idColumn = 'id';
    if (options.id)
    {
      idColumn = options.id;
    }

    // Used to assign temporary IDs to new objects. Needed
    // only when options.local is true (typically for nested admins).
    // The temporary IDs start with _temp_ so they are easier to spot
    // server-side if necessary.
    var tempId = 1;

    // You can override each REST action. You can also set options.local = true;
    // to just update options.data rather than carrying out REST actions. This is
    // very useful for sub-admins

    _.defaults(options, { 'local': false });

    if (options.local)
    {
      _.defaults(options, {
        create: function(datum, params)
        {
          // We need IDs to distinguish objects even for purely local data.
          datum[idColumn] = '_temp_' + tempId++;
          options.data.push(datum);
          params.success(datum);
        },
        update: function(datum, params)
        {
          // datum is already a reference to an
          // existing object in the list
          params.success(datum);
        },
        refreshData: function(params)
        {
          // We hold the data so we don't need to refresh anything.
          // We do need to do the initialization though
          if (options.data === undefined)
          {
            options.data = [];
          }
          params.success();
        },
        remove: function(datum, params)
        {
          // Remove the unwanted element while ensuring that 'data'
          // remains a reference to the same array object, which is a
          // critical issue for local storage

          var i;
          var index = false;
          for (i = 0; (i < options.data.length); i++)
          {
            var item = options.data[i];
            if (item[idColumn] === datum[idColumn])
            {
              index = i;
              break;
            }
          }
          if (index !== false)
          {
            for (i = index + 1; (i < options.data.length); i++)
            {
              options.data[i - 1] = options.data[i];
            }
            options.data.length--;
          }
          params.success(datum);
        },
        rank: function(order, params)
        {
          var byId = _.groupBy(options.data, function(datum) {
            return datum[idColumn];
          });
          // Rebuild the array without losing our reference
          // to the same object, which is a critical issue for local storage
          options.data.length = 0;
          _.each(order, function(id) {
            options.data.push(byId[id]);
          });
          params.success(order);
        }
      });
    }

    // Standard REST functionality

    // POST a new item
    if (!options.create)
    {
      options.create = function(datum, params)
      {
        $.ajax(options.url, {
          type: 'POST',
          data: datum,
          dataType: 'json',
          success: params.success,
          error: params.error
        });
      };
    }

    // PUT an existing item
    if (!options.update)
    {
      options.update = function(datum, params)
      {
        $.ajax(options.url + '/' + datum[idColumn], {
          type: 'PUT',
          data: datum,
          dataType: 'json',
          success: params.success,
          error: params.error
        });
      };
    }

    // GET all items
    if (!options.loadData)
    {
      options.loadData = function(params)
      {
        $.ajax(options.url, {
          type: 'GET',
          dataType: 'json',
          success: params.success,
          error: params.error
        });
      };
    }

    // DELETE an existing item
    if (!options.remove)
    {
      options.remove = function(datum, params)
      {
        $.ajax(options.url + '/' + datum[idColumn], {
          type: 'DELETE',
          dataType: 'json',
          success: params.success,
          error: params.error
        });
      };
    }

    // Change sort order for all items
    // (never called if options.sortable is false)
    if (!options.rank)
    {
      options.rank = function(order, params)
      {
        $.ajax(options.url + '/rank', {
          type: 'PUT',
          dataType: 'json',
          data: { order: order },
          success: params.success,
          error: params.error
        });
      };
    }

    // Types can be overridden freely to any degree

    if (!options.types)
    {
      options.types = {};
    }

    if (!options.types.text)
    {
      options.types.text = {};
    }

    _.defaults(options.types.text, {
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

    if (!options.types.textarea)
    {
      options.types.textarea = {};
    }

    _.defaults(options.types.textarea, {
      listText: function(column, val) {
        return val.substr(0, 80);
      },
      control: function(column, val) {
        var e = $('<textarea data-role="control"></textarea>');
        e.val(val);
        return e;
      },
      defaultValue: ''
    });

    if (!options.types.richtext)
    {
      options.types.richtext = {};
    }

    _.defaults(options.types.richtext, {
      listText: function(column, val) {
        var el = $('<div></div>');
        try {
          el.html(val);
          return el.text().substr(0, 80);
        } catch (e) {
          return '';
        }
      },
      control: function(column, val) {
        var id = 'jra-rte-' + Math.floor(Math.random() * 1000000000);
        var e = $('<textarea data-role="control" class="jquery-rest-admin jwysiwyg"></textarea>');
        e.attr('id', id);
        e.val(val);
        e.bind('jraUpdate', function() {
          CKEDITOR.instances[id].updateElement();
        });
        // Wait until it's actually in the DOM
        e.bind('jraAdded', function() {
          $(function() {
            CKEDITOR.replace(id);
          });
        });
        return e;
      },
      defaultValue: ''
    });

    if (!options.types.checkbox)
    {
      options.types.checkbox = {};
    }

    _.defaults(options.types.checkbox, {
      listText: function(column, val) {
        return val ? 'Yes' : 'No';
      },
      control: function(column, val) {
        var e = $('<input type="checkbox" data-role="control" value="1" />');
        e[0].checked = val;
        return e;
      },
      // Checkboxes don't do what you'd expect when val() is called.
      // I forget this once a year, which is why I hate checkboxes
      getValue: function(column, e)
      {
        // These values are truthy and falsy, respectively, when 
        // tested on the server side by either node or PHP. That
        // suits us better than the strings "true" and "false"
        // being submitted. An explicit empty string is much less
        // ambiguous than not submitting the field at all, as a
        // traditional HTML form would do for an unchecked box.
        return e[0].checked ? 1 : '';
      },
      defaultValue: false
    });

    if (!options.types.readOnly)
    {
      options.types.readOnly = {};
    }

    _.defaults(options.types.readOnly, {
      listText: function(column, val) {
        return val;
      },
      control: function(column, val) {
        var e = $('<input type="text" readonly data-role="control"></span>');
        e.val(val);
        return e;
      },
      defaultValue: ''
    });

    if (!options.types.select)
    {
      options.types.select = {};
    }

    _.defaults(options.types.select, {
      listText: function(column, val) {
        var labelColumn = column.choiceLabel ? column.choiceLabel : 'label';
        var valueColumn = column.choiceValue ? column.choiceValue : 'value';
        var choice = _.find(column.choices, function(choice) {
          // Allows both simple values and nested objects that have a suitable value column
          if (typeof(val) !== 'object')
          {
            return (choice[valueColumn] === val);
          }
          else
          {
            return (choice[valueColumn] === val[valueColumn]);
          }
        });
        return choice ? choice[labelColumn] : null;
      },
      control: function(column, val) {
        var labelColumn = column.choiceLabel ? column.choiceLabel : 'label';
        var valueColumn = column.choiceValue ? column.choiceValue : 'value';
        var e = $('<select data-role="control" />');
        _.each(column.choices, function(choice) {
          var option = $('<option></option>');
          option.text(choice[labelColumn]);
          option.attr('value', choice[valueColumn]);
          e.append(option);
        });
        // Allows both simple values and nested objects that have a suitable value column
        if (typeof(val) === 'object')
        {
          e.val(val[valueColumn]);
        }
        else
        {
          e.val(val);
        }
        return e;
      },
      defaultValue: undefined
    });

    // Want to nest an admin in an admin? Who am I to say no?

    if (!options.types.admin)
    {
      options.types.admin = {};
    }

    _.defaults(options.types.admin, {
      listText: function(column, val) {
        var labels = [];
        _.each(val, function(datum) {
          labels.push(datum[column.labelColumn]);
        });
        return labels.join(', ');
      },
      control: function(column, val) {
        var e = $('<div class="nested-rest-admin" data-role="nestedRestAdmin"></div>');
        var subAdminOptions = {};
        _.defaults(column.options, { local: true });
        _.extend(subAdminOptions, column.options, { data: val });
        e.restAdmin(subAdminOptions);
        return e;
      },
      // Don't call val(), we update directly by reference
      selfUpdating: true,
      // We need an array object at a minimum so we can modify it by reference and
      // see that from the parent object when using 'local' storage
      defaultValue: []
    });

    if (!options.refreshData)
    {
      options.refreshData = function(params)
      {
        options.loadData({
          success: function(newData) {
            options.data = newData;
            params.success();
          }
        });
      };
    }

    if (!options.data)
    {
      options.refreshData({ success: list });
    }
    else
    {
      list();
    }

    function eachColumn(columnFunction)
    {
      _.each(options.schema, function(column) {
        columnFunction(column);
      });
    }

    function list()
    {
      var table = $('<table class="table table-striped"></table>');
      var headerRow = $('<tr></tr>');

      eachColumn(function(column) {
        var th = $('<th></th>');
        th.text(column.label);
        th.addClass(column.name);
        headerRow.append(th);
      });
      headerRow.append($('<th>Actions</th>'));
      var header = $('<thead></thead>');
      header.append(headerRow);
      table.append(header);
      var tbody = $('<tbody></tbody>');
      _.each(options.data, function(datum) {
        var row = $('<tr data-role="row"></tr>');
        var first = true;
        eachColumn(function(column) {
          var val = options.types[column.type].listText(column, datum[column.name]);
          var td = $('<td></td>');
          td.addClass(column.name);
          if (first)
          {
            if (options.sortable)
            {
              td.append($('<i class="icon-move"></i>'));
            }
            first = false;
          }
          var text = options.types[column.type].listText(column, datum[column.name]);
          td.append(text);
          row.append(td);
        });
        var controls = $('<td><a href="#" class="btn btn-mini " data-role="edit"><i class="icon-pencil"></i> Edit</a></td>');
        row.append(controls);
        row.data('id', datum[idColumn]);
        tbody.append(row);
        row.css('cursor', 'pointer');
        controls.find('[data-role="edit"]').click(function() {
          edit(datum);
          return false;
        });
      });
      if (options.sortable)
      {
        tbody.sortable().disableSelection().bind('sortupdate', function(event, ui) {
          var items = tbody.find('[data-role="row"]');
          rankMap = [];
          items.each(function(i, item) {
            rankMap.push($(item).data('id'));
          });
          options.rank(rankMap, {
            error: function() {
              // If something goes wrong server-side,
              // we should no longer guess at the appropriate
              // sort order. Just refresh. Om.
              options.refreshData({ success: list });
            }
          });
        });
      }
      table.append(tbody);

      var newButton = $('<button class="btn btn-primary btn-large" data-role="new"><i class="icon-plus"></i> New</button>');
      newButton.click(function() {
        edit(false);
        return false;
      });

      container.html('');
      container.append(newButton);
      container.append(table);
      // Listening to this event is helpful if you need to update
      // other things on the page when the list is refreshed. For
      // instance, if you're using jquery.restAdmin as a CMS for
      // page components, you might want to actually update them.
      // Note that all saved edits are followed by this event.
      container.trigger('jraRefreshedList');
    }

    function edit(datum)
    {
      var isNew = (datum === false);
      var outer = $('<div class="editor"></div>');
      var form = $('<form></form>');
      if (isNew)
      {
        datum = {};
        eachColumn(function(column) {
          // If no default is specified for this column, use the default
          // for the column type (for instance, a nested admin must at least
          // be an empty array).
          if (column.defaultValue !== undefined)
          {
            datum[column.name] = column.defaultValue;
          }
          else
          {
            datum[column.name] = options.types[column.type].defaultValue;
          }
        });
      }
      eachColumn(function(column) {
        var fieldset = $('<fieldset data-role="fieldset"><label data-role="label"></label></fieldset>');
        var arrow = $('<i class="attention-arrow icon-hand-right"></i>');
        arrow.hide();
        fieldset.append(arrow);
        column.arrow = arrow;
        fieldset.find('[data-role="label"]').text(column.label);
        var control = options.types[column.type].control(column, datum[column.name]);
        control.attr('data-column', column.name);
        if (column.type == ('checkbox' || 'radio')) {
          fieldset.find('label').prepend(control).addClass(column.type);
        }
        else {
          fieldset.append(control);
        }

        form.append(fieldset);
      });
      outer.append(form);
      var controlGroup = $('<div class="form-actions"></div>');
      var saveButton = $('<button class="btn btn-primary" data-role="submit">Save</button> ');
      var cancelButton = $('<button class="btn" data-role="cancel">Cancel</button> ');
      var removeButton;
      if (!isNew)
      {
        removeButton = $('<button class="btn btn-danger" data-role="delete">Delete</button> ');
      }
      saveButton.click(function() {
        var invalid = false;
        eachColumn(function(column) {
          // Some types just update the datum directly
          updateColumn(datum, column);
          if (column.required && (!datum[column.name]))
          {
            column.arrow.show();
            // Flag missing items
            invalid = true;
          }
          if (column.unique && (isDuplicate(datum, column)))
          {
            column.arrow.show();
            // Flag duplicate items
            invalid = true;
          }
        });
        if (invalid)
        {
          return false;
        }
        var method = isNew ? 'create' : 'update';
        options[method](
          datum,
          {
            'success': function(newDatum) {
              // We have consistently been burned when we have
              // assumed we know exactly how to update the list view
              // from the browser side. Think about pagination,
              // sort order, and server side cleaning of the data.
              // Discover humility. Call refresh. Om.
              options.refreshData({ success: list });
            }
          }
        );
        return false;
      });
      cancelButton.click(function() {
        list();
        return false;
      });
      if (!isNew)
      {
        removeButton.click(function() {
          var invalid = false;
          eachColumn(function(column) {
            if (column.deleteValidator)
            {
              updateColumn(datum, column);
              if (!column.deleteValidator(datum, options.schema, column.name))
              {
                column.arrow.show();
                invalid = true;
              }
            }
          });
          if (invalid)
          {
            return false;
          }
          if (!options.removeConfirm)
          {
            options.removeConfirm = "Are you sure you want to delete this item?";
          }
          if (confirm(options.removeConfirm))
          {
            options.remove(
              datum,
              {
                'success':  function(datum) {
                  // We have consistently been burned when we have
                  // assumed we know exactly how to update the list view
                  // from the browser side. Think about pagination,
                  // sort order, and server side cleaning of the data.
                  // Discover humility. Call refresh. Om.
                  options.refreshData({ success: list });
                }
              }
            );
          }
          return false;
        });
      }
      form.append(controlGroup);
      controlGroup.append(saveButton);
      controlGroup.append(cancelButton);
      if (!isNew)
      {
        controlGroup.append(removeButton);
      }
      container.html('');
      container.append(outer);

      // Useful for controls that need to do certain things
      // only after they are really added to the document
      container.find('[data-role="control"]').trigger('jraAdded');

      function updateColumn(datum, column)
      {
        // Some controls need a nudge to update
        // (for example, rich text editors need to sync
        // to their associated hidden textarea)
        form.find('[data-role="control"]').trigger('jraUpdate');
        var type = options.types[column.type];
        if (!type.selfUpdating)
        {
          if (type.getValue) {
            datum[column.name] = type.getValue(column, form.find('[data-column="' + column.name + '"]'));
          } else {
            datum[column.name] = form.find('[data-column="' + column.name + '"]').val();
          }
        }
      }
    }

    function isDuplicate(datum, column)
    {
      return _.any(options.data, function(item) {
        return ((datum[column.name] === item[column.name]) && (datum[idColumn] !== item[idColumn]));
      });
    }
  };

})( jQuery );
