import cx from "classnames";
import type { MouseEvent } from "react";
import { Fragment, useMemo } from "react";
import { t } from "ttag";

import EmptyState from "metabase/components/EmptyState";
import { Ellipsified } from "metabase/core/components/Ellipsified";
import { formatValue, formatColumn } from "metabase/lib/formatting";
import ExpandableString from "metabase/query_builder/components/ExpandableString";
import type Question from "metabase-lib/Question";
import { findColumnIndexForColumnSetting } from "metabase-lib/queries/utils/dataset";
import { TYPE } from "metabase-lib/types/constants";
import {
  isa,
  isID,
  isImageURL,
  isAvatarURL,
} from "metabase-lib/types/utils/isa";
import type { DatasetData, VisualizationSettings } from "metabase-types/api";

import {
  ObjectDetailsTable,
  GridContainer,
  GridCell,
  FitImage,
} from "./ObjectDetailsTable.styled";
import type { OnVisualizationClickType } from "./types";

export interface DetailsTableCellProps {
  column: any;
  value: any;
  isColumnName: boolean;
  settings: any;
  className?: string;
  onVisualizationClick: OnVisualizationClickType;
  visualizationIsClickable: (clicked: unknown) => boolean;
}

export function DetailsTableCell({
  column,
  value,
  isColumnName,
  settings,
  className = "",
  onVisualizationClick,
  visualizationIsClickable,
}: DetailsTableCellProps): JSX.Element {
  let cellValue;
  const clicked = { column: null, value: null };
  let isLink;

  const columnSettings = settings?.column?.(column) ?? {};
  const columnTitle =
    columnSettings?.["_column_title_full"] || formatColumn(column);

  if (isColumnName) {
    const title = column !== null ? columnTitle : null;
    cellValue = <Ellipsified lines={8}>{title}</Ellipsified>;
    clicked.column = column;
    isLink = false;
  } else {
    if (value === null || value === undefined || value === "") {
      cellValue = <span className="text-light">{t`Empty`}</span>;
    } else if (isa(column.semantic_type, TYPE.SerializedJSON)) {
      let formattedJson;
      try {
        formattedJson = JSON.stringify(JSON.parse(value), null, 2);
      } catch (e) {
        formattedJson = value;
      }
      cellValue = <pre className="ObjectJSON">{formattedJson}</pre>;
    } else if (typeof value === "object") {
      const formattedJson = JSON.stringify(value, null, 2);
      cellValue = <pre className="ObjectJSON">{formattedJson}</pre>;
    } else {
      cellValue = formatValue(value, {
        ...columnSettings,
        jsx: true,
        rich: true,
      });
      if (typeof cellValue === "string") {
        cellValue = <ExpandableString str={cellValue} length={140} />;
      }
    }
    clicked.column = column;
    clicked.value = value;
    isLink = isID(column);
  }

  const isClickable = onVisualizationClick != null;

  const isImage =
    !isColumnName &&
    (isImageURL(column) || isAvatarURL(column)) &&
    typeof value === "string" &&
    value.startsWith("http");

  const handleClick = (e: MouseEvent<HTMLSpanElement>) => {
    if (onVisualizationClick && visualizationIsClickable(clicked)) {
      onVisualizationClick({ ...clicked, element: e.currentTarget });
    }
  };

  return (
    <div>
      <span
        className={cx(
          {
            "cursor-pointer": onVisualizationClick,
            link: isClickable && isLink,
          },
          className,
        )}
        onClick={handleClick}
      >
        {cellValue}
      </span>
      {isImage && (
        <div>
          <FitImage src={value} alt={value} />
        </div>
      )}
    </div>
  );
}

export interface DetailsTableProps {
  data: DatasetData;
  zoomedRow: unknown[];
  settings: VisualizationSettings;
  question?: Question;
  onVisualizationClick: OnVisualizationClickType;
  visualizationIsClickable: (clicked: unknown) => boolean;
}

export function DetailsTable({
  data,
  zoomedRow,
  settings,
  onVisualizationClick,
  visualizationIsClickable,
  question,
}: DetailsTableProps): JSX.Element {
  const { cols: columns } = data;
  const columnSettings = settings["table.columns"];

  const { cols, row } = useMemo(() => {
    if (!columnSettings) {
      return { cols: columns, row: zoomedRow };
    }
    const columnIndexes = columnSettings
      .filter(columnSetting => columnSetting?.enabled)
      .map(columnSetting =>
        findColumnIndexForColumnSetting(
          columns,
          columnSetting,
          question?.query(),
        ),
      )
      .filter(
        (columnIndex: number) =>
          columnIndex >= 0 && columnIndex < columns.length,
      );

    return {
      cols: columnIndexes.map((i: number) => columns[i]) as any[],
      row: columnIndexes.map((i: number) => zoomedRow[i]),
    };
  }, [columnSettings, columns, zoomedRow, question]);

  if (!cols?.length) {
    return (
      <EmptyState message={t`Select at least one column`} className="p3" />
    );
  }

  if (!row?.length) {
    return <EmptyState message={t`No details found`} className="p3" />;
  }

  return (
    <ObjectDetailsTable>
      <GridContainer cols={3}>
        {cols.map((column, columnIndex) => {
          const columnValue = row[columnIndex];

          return (
            <Fragment key={columnIndex}>
              <GridCell>
                <DetailsTableCell
                  column={column}
                  value={row[columnIndex] ?? t`Empty`}
                  isColumnName
                  settings={settings}
                  className="text-bold text-medium"
                  onVisualizationClick={onVisualizationClick}
                  visualizationIsClickable={visualizationIsClickable}
                />
              </GridCell>
              <GridCell colSpan={2}>
                <DetailsTableCell
                  column={column}
                  value={columnValue}
                  isColumnName={false}
                  settings={settings}
                  className="text-bold text-dark text-spaced text-wrap"
                  onVisualizationClick={onVisualizationClick}
                  visualizationIsClickable={visualizationIsClickable}
                />
              </GridCell>
            </Fragment>
          );
        })}
      </GridContainer>
    </ObjectDetailsTable>
  );
}
