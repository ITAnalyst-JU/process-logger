import React from 'react';
import { Column, useTable } from 'react-table'
import { ColumnNames, columnsDisplayNames, ParseEvent } from "./types";

interface Props {
  selectedColumns: ColumnNames[];
  data: ParseEvent[];
}

export function LogTable() {
  const columns = React.useMemo(
      () => [
        {
          Header: "Event",
          columns: [
            {
              Header: "Time",
              accessor: "time"
            },
            {
              Header: "Process Id",
              accessor: "pid"
            }
          ]
        },
        {
          Header: "Details",
          columns: [
            {
              Header: "Output/Result",
              accessor: "content"
            }
          ]
        }
      ],
      []
  );
  const data = [
    {
      time: 10,
      pid: 11,
      content: "ala ma kota",
    }
  ];

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    columns,
    data,
  })

  // Render the UI for your table
  return (
      <table {...getTableProps()}>
        <thead>
        {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                  <th {...column.getHeaderProps()}>{column.render('Header')}</th>
              ))}
            </tr>
        ))}
        </thead>
        <tbody {...getTableBodyProps()}>
        {rows.map((row, i) => {
          prepareRow(row)
          return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => {
                  return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                })}
              </tr>
          )
        })}
        </tbody>
      </table>
  )
}
