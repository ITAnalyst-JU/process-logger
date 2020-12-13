import React from 'react';
import * as ReactTable from "reactable";
import {TableColumn, ParseEvent, columnsInfo} from "./types";

interface Props {
  selectedColumns: TableColumn[];
  data: ParseEvent[];
}

export function LogTable(props: Props) {
  const columns = props.selectedColumns.map((column) => columnsInfo.get(column)!)
  return (
      <ReactTable.Table
          data={props.data}
          columns={columns}
      />
  )
}
