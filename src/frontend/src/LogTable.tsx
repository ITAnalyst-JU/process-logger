import React from 'react';
import * as ReactTable from "reactable";
import {TableColumn, ParseEvent, columnsInfo, RowPredicate} from "./types";

interface Props {
  selectedColumns: TableColumn[];
  data: ParseEvent[];
  filter: (parseEvent: ParseEvent) => boolean;
}

export function LogTable(props: Props) {
  const columns = props.selectedColumns.map((column) => columnsInfo.get(column)!)
  let filteredData = props.data;
  try {
    filteredData = props.data.filter((record) => props.filter(record))
  } catch (e) {
    console.log("Something wrong with the predicate.");
  }
  return (
      <ReactTable.Table
          data={filteredData}
          columns={columns}
      />
  )
}
