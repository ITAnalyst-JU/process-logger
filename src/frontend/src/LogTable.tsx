import React from 'react';
import * as ReactTable from "reactable";
import {TableColumn, ParseEvent, columnsInfo, RowPredicate, ParseOutputLine} from "./types";

interface Props {
  selectedColumns: TableColumn[];
  data: ParseEvent[];
  filter_: (parseEvent: ParseEvent) => boolean;
}
// @ts-ignore
const unsafe = ReactTable.unsafe;

export function LogTable(props: Props) {
  const columns = props.selectedColumns.map((column) => columnsInfo.get(column)!)
  let filteredData = props.data;
  console.log('LogTable running with ', props);
  try {
    filteredData = props.data.filter((record) => props.filter_(record))
  } catch (e) {
    console.log("Something wrong with the predicate:", e);
  }
  filteredData.map((record) => {
    if ((record as ParseOutputLine).content) {
      // @ts-ignore
      if ((record as ParseOutputLine).content.content) {
        // @ts-ignore
        (record as ParseOutputLine).content = unsafe((record as ParseOutputLine).content.content);
        return record;
      }
      (record as ParseOutputLine).content = unsafe((record as ParseOutputLine).content);
    }
    return record;
  })
  return (
      <ReactTable.Table
          data={filteredData}
          columns={columns}
      />
  )
}
