import React, { Component } from "react";
import { Draggable, Droppable } from "react-drag-and-drop";
import Form from "react-jsonschema-form";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";


function FieldPropertiesEditor(props) {
  const {schema, name, required, uiSchema, cancel, update} = props;
  const formData = {...schema, name, required};
  return (
    <div className="panel panel-default">
      <div className="panel-heading">
        <strong>Edit {name}</strong>
        <button type="button" className="close-btn"
          onClick={cancel}>
          <i className="glyphicon glyphicon-remove-sign"/>
        </button>
      </div>
      <div className="panel-body">
        <Form
          schema={uiSchema.editSchema}
          formData={formData}
          onSubmit={update} />
      </div>
    </div>
  );
}

export default class EditableField extends Component {
  constructor(props) {
    super(props);
    this.state = {edit: false, schema: props.schema};
  }

  componentWillReceiveProps(nextProps) {
    this.setState({edit: false, schema: nextProps.schema});
  }

  handleEdit(event) {
    event.preventDefault();
    this.setState({edit: true});
  }

  handleUpdate({formData}) {
    const schema = {...this.props.schema, ...formData};
    this.setState({edit: false, schema});
    // XXX handle rename
    this.props.updateField(
      this.props.name, schema, formData.required, formData.name);
  }

  handleDelete(event) {
    event.preventDefault();
    if (confirm("Are you sure you want to delete this field?")) {
      this.props.removeField(this.props.name);
    }
  }

  handleCancel(event) {
    event.preventDefault();
    this.setState({edit: false});
  }

  handleDrop(data) {
    const {name} = this.props;
    if ("moved-field" in data && data["moved-field"]) {
      if (data["moved-field"] !== name) {
        this.props.swapFields(data["moved-field"], name);
      }
    } else if ("field" in data && data.field) {
      this.props.insertField(JSON.parse(data.field), name);
    }
  }

  render() {
    const props = this.props;

    if (props.schema.type === "object") {
      // This can only be the root form object, returning a regular SchemaField.
      return <SchemaField {...props}/>;
    }

    if (this.state.edit) {
      return (
        <FieldPropertiesEditor
          {...props}
          cancel={this.handleCancel.bind(this)}
          update={this.handleUpdate.bind(this)} />
      );
    }

    return (
      <Draggable type="moved-field" data={props.name}>
        <Droppable types={["moved-field", "field"]}
          onDrop={this.handleDrop.bind(this)}>
          <div className="row editable-field"
               onDoubleClick={this.handleEdit.bind(this)}>
            <div className="col-sm-9">
              <SchemaField {...props} schema={this.state.schema} />
            </div>
            <div className="col-sm-3 editable-field-actions">
              <button onClick={this.handleEdit.bind(this)}>
                <i className="glyphicon glyphicon-edit"/>
              </button>
              <button onClick={this.handleDelete.bind(this)}>
                <i className="glyphicon glyphicon-remove-sign"/>
              </button>
            </div>
          </div>
        </Droppable>
      </Draggable>
    );
  }
}
