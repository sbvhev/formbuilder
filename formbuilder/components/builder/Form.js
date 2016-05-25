import React from "react";
import { Droppable } from "react-drag-and-drop";

import Default from "./Default";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";

export default function EditableForm(props) {
  const {error, schema} = props;
  const {properties} = schema;

  const onClick = (event) => {
    props.publishForm(({collection, adminToken}) => {
      props.history.pushState(null, `/builder/published/${collection}/${adminToken}`);
    });
  };

  const onDrop = ({field}) => props.addField(JSON.parse(field));
  const registry = {
    ...SchemaField.defaultProps.registry,
    fields: {
      ...SchemaField.defaultProps.registry.fields,
      SchemaField: props.SchemaField,
      TitleField: props.TitleField,
    }
  };

  let saveButtonValue = "Create form";
  if (props.status == "pending") {
    saveButtonValue = <div>Create form <i className="spin glyphicon glyphicon-refresh" /></div>;
  } else if (props.status == "done") {
    saveButtonValue = <div>Form saved <i className="glyphicon glyphicon-ok" /></div>;
  }
  const button = (
    <div className="pull-right">
      <button onClick={onClick} className="btn btn-success align-right">
        {saveButtonValue}
      </button>
    </div>);

  return (
    <div>
      {error ? <div className="alert alert-danger">{error}</div> : <div/>}
      <div className="rjsf">
        <SchemaField {...props} registry={registry} />
      </div>
      <Droppable types={["field"]} className="form-area" onDrop={onDrop}>
        {Object.keys(properties).length === 0 ?
          <Default /> : <div/>}
      </Droppable>
      {Object.keys(properties).length === 0 ? <div/> : button}
    </div>
  );
}
