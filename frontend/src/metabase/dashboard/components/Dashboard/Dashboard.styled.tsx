import { css } from "@emotion/react";
import styled from "@emotion/styled";
import cx from "classnames";
import type { ComponentPropsWithoutRef } from "react";

import LoadingAndErrorWrapper from "metabase/components/LoadingAndErrorWrapper";
import { color } from "metabase/lib/colors";
import { FullWidthContainer } from "metabase/styled-components/layout/FullWidthContainer";
import { breakpointMaxSmall, space } from "metabase/styled-components/theme";
import { SAVING_DOM_IMAGE_CLASS } from "metabase/visualizations/lib/save-chart-image";

import { DashCard } from "../DashCard/DashCard";

// Class names are added here because we still use traditional css,
// see dashboard.css
export const DashboardLoadingAndErrorWrapper = styled(
  ({
    isFullscreen,
    isNightMode,
    className,
    ...props
  }: ComponentPropsWithoutRef<typeof LoadingAndErrorWrapper>) => {
    return (
      <LoadingAndErrorWrapper
        className={cx(className, "Dashboard", {
          "Dashboard--fullscreen": isFullscreen,
          "Dashboard--night": isNightMode,
        })}
        {...props}
      />
    );
  },
)`
  min-height: 100%;
  height: 1px;
  // prevents header from scrolling so we can have a fixed sidebar
  ${({ isFullHeight }) =>
    isFullHeight &&
    css`
      height: 100%;
    `}
`;

export const DashboardStyled = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
`;

export const DashboardBody = styled.div<{ isEditingOrSharing: boolean }>`
  position: relative;
  display: flex;
  flex: 1 0 auto;
  min-width: 0;
  min-height: 0;

  ${({ isEditingOrSharing }) =>
    isEditingOrSharing &&
    css`
      flex-basis: 0;
    `}
`;

export const DashboardHeaderContainer = styled.header<{
  isFullscreen: boolean;
  isNightMode: boolean;
}>`
  position: relative;
  z-index: 2;

  background-color: ${color("bg-white")};
  border-bottom: 1px solid ${color("border")};

  ${({ isFullscreen }) =>
    isFullscreen &&
    css`
      background-color: transparent;
      border: none;
    `}

  ${({ isNightMode }) =>
    isNightMode &&
    css`
      color: ${color("text-white")};
    `}
`;

export const ParametersAndCardsContainer = styled.div<{
  shouldMakeDashboardHeaderStickyAfterScrolling: boolean;
}>`
  flex: auto;
  min-width: 0;
  overflow-y: ${({ shouldMakeDashboardHeaderStickyAfterScrolling }) =>
    shouldMakeDashboardHeaderStickyAfterScrolling ? "auto" : "visible"};
  overflow-x: hidden;
  @supports (overflow-x: clip) {
    overflow-x: clip;
  }
  padding-bottom: 40px;
`;

export const ParametersWidgetContainer = styled(FullWidthContainer)<{
  isSticky: boolean;
  hasScroll: boolean;
}>`
  background-color: ${color("bg-light")};
  border-bottom: 1px solid ${color("bg-light")};
  padding-top: ${space(1)};
  padding-bottom: ${space(1)};
  /* z-index should be higher than in dashcards */
  z-index: 3;
  top: 0;
  left: 0;

  /* isSticky is calculated mostly for border showing, otherwise it could be replaced with css only */
  ${({ isSticky, hasScroll }) =>
    isSticky &&
    css`
      position: sticky;
      border-bottom: 1px solid
        ${hasScroll ? color("border") : color("bg-light")};
    `}
`;

export const CardsContainer = styled(FullWidthContainer)`
  margin-top: 8px;

  &.${SAVING_DOM_IMAGE_CLASS} {
    padding-bottom: 20px;

    ${DashCard.root} {
      box-shadow: none;
      border: 1px solid ${color("border")};
    }
  }
`;

export const FIXED_WIDTH = "1048px";
export const FixedWidthContainer = styled.div<{
  isFixedWidth: boolean;
}>`
  width: 100%;

  ${({ isFixedWidth }) =>
    isFixedWidth &&
    css`
      margin: 0 auto;
      max-width: ${FIXED_WIDTH};
    `}
`;

export const ParametersFixedWidthContainer = styled(FixedWidthContainer)`
  display: flex;
  flex-direction: row;
  align-items: flex-start;

  ${breakpointMaxSmall} {
    flex-direction: column;
  }
`;
