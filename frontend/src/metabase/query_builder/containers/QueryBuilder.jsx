/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import { push } from "react-router-redux";
import { useMount, useUnmount, usePrevious } from "react-use";
import { t } from "ttag";
import _ from "underscore";

import { LeaveConfirmationModal } from "metabase/components/LeaveConfirmationModal";
import Bookmark from "metabase/entities/bookmarks";
import Collections from "metabase/entities/collections";
import Timelines from "metabase/entities/timelines";
import favicon from "metabase/hoc/Favicon";
import title from "metabase/hoc/Title";
import titleWithLoadingTime from "metabase/hoc/TitleWithLoadingTime";
import { useCallbackEffect } from "metabase/hooks/use-callback-effect";
import { useForceUpdate } from "metabase/hooks/use-force-update";
import { useLoadingTimer } from "metabase/hooks/use-loading-timer";
import { useWebNotification } from "metabase/hooks/use-web-notification";
import { useSelector } from "metabase/lib/redux";
import { closeNavbar } from "metabase/redux/app";
import { getIsNavbarOpen } from "metabase/selectors/app";
import { getMetadata } from "metabase/selectors/metadata";
import { getSetting } from "metabase/selectors/settings";
import {
  getUser,
  getUserIsAdmin,
  canManageSubscriptions,
} from "metabase/selectors/user";
import { getWhiteLabeledLoadingMessage } from "metabase/selectors/whitelabel";

import * as actions from "../actions";
import View from "../components/view/View";
import { VISUALIZATION_SLOW_TIMEOUT } from "../constants";
import {
  getCard,
  getDatabasesList,
  getDataReferenceStack,
  getOriginalCard,
  getLastRunCard,
  getFirstQueryResult,
  getQueryResults,
  getParameterValues,
  getIsDirty,
  getIsObjectDetail,
  getTables,
  getTableForeignKeys,
  getTableForeignKeyReferences,
  getUiControls,
  getParameters,
  getDatabaseFields,
  getSampleDatabaseId,
  getNativeDatabases,
  getIsRunnable,
  getIsResultDirty,
  getMode,
  getModalSnippet,
  getSnippetCollectionId,
  getQuestion,
  getOriginalQuestion,
  getQueryStartTime,
  getRawSeries,
  getQuestionAlerts,
  getVisualizationSettings,
  getIsNativeEditorOpen,
  getIsVisualized,
  getIsLiveResizable,
  getNativeEditorCursorOffset,
  getNativeEditorSelectedText,
  getIsBookmarked,
  getVisibleTimelineEvents,
  getVisibleTimelineEventIds,
  getSelectedTimelineEventIds,
  getFilteredTimelines,
  getTimeseriesXDomain,
  getIsAnySidebarOpen,
  getDocumentTitle,
  getPageFavicon,
  getIsTimeseries,
  getIsLoadingComplete,
  getIsHeaderVisible,
  getIsActionListVisible,
  getIsAdditionalInfoVisible,
  getAutocompleteResultsFn,
  getCardAutocompleteResultsFn,
  isResultsMetadataDirty,
  getShouldShowUnsavedChangesWarning,
  getRequiredTemplateTags,
  getEmbeddedParameterVisibility,
} from "../selectors";
import { isNavigationAllowed } from "../utils";

const timelineProps = {
  query: { include: "events" },
  loadingAndErrorWrapper: false,
};

const mapStateToProps = (state, props) => {
  return {
    user: getUser(state, props),
    canManageSubscriptions: canManageSubscriptions(state, props),
    isAdmin: getUserIsAdmin(state, props),

    mode: getMode(state),

    question: getQuestion(state),
    originalQuestion: getOriginalQuestion(state),
    lastRunCard: getLastRunCard(state),

    parameterValues: getParameterValues(state),

    tableForeignKeys: getTableForeignKeys(state),
    tableForeignKeyReferences: getTableForeignKeyReferences(state),

    card: getCard(state),
    originalCard: getOriginalCard(state),
    databases: getDatabasesList(state),
    nativeDatabases: getNativeDatabases(state),
    tables: getTables(state),

    metadata: getMetadata(state),

    timelines: getFilteredTimelines(state),
    timelineEvents: getVisibleTimelineEvents(state),
    selectedTimelineEventIds: getSelectedTimelineEventIds(state),
    visibleTimelineEventIds: getVisibleTimelineEventIds(state),
    xDomain: getTimeseriesXDomain(state),

    result: getFirstQueryResult(state),
    results: getQueryResults(state),
    rawSeries: getRawSeries(state),

    uiControls: getUiControls(state),
    ...state.qb.uiControls,
    dataReferenceStack: getDataReferenceStack(state),
    isAnySidebarOpen: getIsAnySidebarOpen(state),

    isBookmarked: getIsBookmarked(state, props),
    isDirty: getIsDirty(state),
    isObjectDetail: getIsObjectDetail(state),
    isNativeEditorOpen: getIsNativeEditorOpen(state),
    isNavBarOpen: getIsNavbarOpen(state),
    isVisualized: getIsVisualized(state),
    isLiveResizable: getIsLiveResizable(state),
    isTimeseries: getIsTimeseries(state),
    isHeaderVisible: getIsHeaderVisible(state),
    isActionListVisible: getIsActionListVisible(state),
    isAdditionalInfoVisible: getIsAdditionalInfoVisible(state),

    parameters: getParameters(state),
    databaseFields: getDatabaseFields(state),
    sampleDatabaseId: getSampleDatabaseId(state),

    isRunnable: getIsRunnable(state),
    isResultDirty: getIsResultDirty(state),
    isMetadataDirty: isResultsMetadataDirty(state),

    questionAlerts: getQuestionAlerts(state),
    visualizationSettings: getVisualizationSettings(state),

    autocompleteResultsFn: getAutocompleteResultsFn(state),
    cardAutocompleteResultsFn: getCardAutocompleteResultsFn(state),

    initialCollectionId: Collections.selectors.getInitialCollectionId(
      state,
      props,
    ),
    queryStartTime: getQueryStartTime(state),
    nativeEditorCursorOffset: getNativeEditorCursorOffset(state),
    nativeEditorSelectedText: getNativeEditorSelectedText(state),
    modalSnippet: getModalSnippet(state),
    snippetCollectionId: getSnippetCollectionId(state),
    documentTitle: getDocumentTitle(state),
    pageFavicon: getPageFavicon(state),
    isLoadingComplete: getIsLoadingComplete(state),
    loadingMessage: getWhiteLabeledLoadingMessage(state),

    reportTimezone: getSetting(state, "report-timezone-long"),

    requiredTemplateTags: getRequiredTemplateTags(state),
    getEmbeddedParameterVisibility: slug =>
      getEmbeddedParameterVisibility(state, slug),
  };
};

const mapDispatchToProps = {
  ...actions,
  closeNavbar,
  onChangeLocation: push,
  createBookmark: id => Bookmark.actions.create({ id, type: "card" }),
  deleteBookmark: id => Bookmark.actions.delete({ id, type: "card" }),
};

function QueryBuilder(props) {
  const {
    question,
    originalQuestion,
    location,
    params,
    uiControls,
    isNativeEditorOpen,
    isAnySidebarOpen,
    closeNavbar,
    initializeQB,
    apiCreateQuestion,
    apiUpdateQuestion,
    updateUrl,
    locationChanged,
    setUIControls,
    cancelQuery,
    isBookmarked,
    createBookmark,
    deleteBookmark,
    allLoaded,
    showTimelinesForCollection,
    card,
    isLoadingComplete,
    closeQB,
    route,
  } = props;

  const forceUpdate = useForceUpdate();
  const forceUpdateDebounced = useMemo(
    () => _.debounce(forceUpdate, 400),
    [forceUpdate],
  );
  const timeout = useRef(null);

  const previousUIControls = usePrevious(uiControls);
  const previousLocation = usePrevious(location);
  const wasShowingAnySidebar = usePrevious(isAnySidebarOpen);
  const wasNativeEditorOpen = usePrevious(isNativeEditorOpen);
  const hasQuestion = question != null;
  const collectionId = question?.collectionId();

  const openModal = useCallback(
    (modal, modalContext) => setUIControls({ modal, modalContext }),
    [setUIControls],
  );

  const closeModal = useCallback(
    () => setUIControls({ modal: null, modalContext: null }),
    [setUIControls],
  );

  const setRecentlySaved = useCallback(
    recentlySaved => {
      setUIControls({ recentlySaved });
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        setUIControls({ recentlySaved: null });
      }, 5000);
    },
    [setUIControls],
  );

  const onClickBookmark = () => {
    const {
      card: { id },
    } = props;

    const toggleBookmark = isBookmarked ? deleteBookmark : createBookmark;

    toggleBookmark(id);
  };

  /**
   * Navigation is scheduled so that LeaveConfirmationModal's isEnabled
   * prop has a chance to re-compute on re-render
   */
  const [isCallbackScheduled, scheduleCallback] = useCallbackEffect();

  const handleCreate = useCallback(
    async newQuestion => {
      const shouldBePinned = newQuestion.type() === "model";
      const createdQuestion = await apiCreateQuestion(
        newQuestion.setPinned(shouldBePinned),
      );
      await setUIControls({ isModifiedFromNotebook: false });

      scheduleCallback(async () => {
        await updateUrl(createdQuestion, { dirty: false });

        setRecentlySaved("created");
      });
    },
    [
      apiCreateQuestion,
      setRecentlySaved,
      setUIControls,
      updateUrl,
      scheduleCallback,
    ],
  );

  const handleSave = useCallback(
    async (updatedQuestion, { rerunQuery } = {}) => {
      await apiUpdateQuestion(updatedQuestion, { rerunQuery });
      await setUIControls({ isModifiedFromNotebook: false });

      scheduleCallback(async () => {
        if (!rerunQuery) {
          await updateUrl(updatedQuestion, { dirty: false });
        }

        setRecentlySaved("updated");
      });
    },
    [
      apiUpdateQuestion,
      updateUrl,
      setRecentlySaved,
      setUIControls,
      scheduleCallback,
    ],
  );

  useMount(() => {
    initializeQB(location, params);
  });

  useEffect(() => {
    window.addEventListener("resize", forceUpdateDebounced);
    return () => window.removeEventListener("resize", forceUpdateDebounced);
  });

  const shouldShowUnsavedChangesWarning = useSelector(
    getShouldShowUnsavedChangesWarning,
  );

  useUnmount(() => {
    cancelQuery();
    closeModal();
    closeQB();
    clearTimeout(timeout.current);
  });

  useEffect(() => {
    if (
      (isAnySidebarOpen && !wasShowingAnySidebar) ||
      (isNativeEditorOpen && !wasNativeEditorOpen)
    ) {
      closeNavbar();
    }
  }, [
    isAnySidebarOpen,
    wasShowingAnySidebar,
    isNativeEditorOpen,
    wasNativeEditorOpen,
    closeNavbar,
  ]);

  useEffect(() => {
    if (allLoaded && hasQuestion) {
      showTimelinesForCollection(collectionId);
    }
  }, [allLoaded, hasQuestion, collectionId, showTimelinesForCollection]);

  useEffect(() => {
    const { isShowingDataReference, isShowingTemplateTagsEditor } = uiControls;
    const {
      isShowingDataReference: wasShowingDataReference,
      isShowingTemplateTagsEditor: wasShowingTemplateTagsEditor,
    } = previousUIControls ?? {};

    if (
      isShowingDataReference !== wasShowingDataReference ||
      isShowingTemplateTagsEditor !== wasShowingTemplateTagsEditor
    ) {
      // when the data reference is toggled we need to trigger a rerender after a short delay in order to
      // ensure that some components are updated after the animation completes (e.g. card visualization)
      timeout.current = setTimeout(forceUpdateDebounced, 300);
    }
  }, [uiControls, previousUIControls, forceUpdateDebounced]);

  useEffect(() => {
    if (previousLocation && location !== previousLocation) {
      locationChanged(previousLocation, location, params);
    }
  }, [location, params, previousLocation, locationChanged]);

  const [isShowingToaster, setIsShowingToaster] = useState(false);

  const { isRunning } = uiControls;

  const onTimeout = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      setIsShowingToaster(true);
    }
  }, []);

  useLoadingTimer(isRunning, {
    timer: VISUALIZATION_SLOW_TIMEOUT,
    onTimeout,
  });

  const { requestPermission, showNotification } = useWebNotification();

  useEffect(() => {
    if (isLoadingComplete) {
      setIsShowingToaster(false);

      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        showNotification(
          t`All Set! Your question is ready.`,
          t`${card.name} is loaded.`,
        );
      }
    }
  }, [isLoadingComplete, showNotification, card?.name]);

  const onConfirmToast = useCallback(async () => {
    await requestPermission();
    setIsShowingToaster(false);
  }, [requestPermission]);

  const onDismissToast = useCallback(() => {
    setIsShowingToaster(false);
  }, []);

  const isNewQuestion = !originalQuestion;
  const isLocationAllowed = useCallback(
    location =>
      isNavigationAllowed({
        destination: location,
        question,
        isNewQuestion,
      }),
    [question, isNewQuestion],
  );

  return (
    <>
      <View
        {...props}
        modal={uiControls.modal}
        recentlySaved={uiControls.recentlySaved}
        onOpenModal={openModal}
        onCloseModal={closeModal}
        onSetRecentlySaved={setRecentlySaved}
        onSave={handleSave}
        onCreate={handleCreate}
        handleResize={forceUpdateDebounced}
        toggleBookmark={onClickBookmark}
        onDismissToast={onDismissToast}
        onConfirmToast={onConfirmToast}
        isShowingToaster={isShowingToaster}
      />

      <LeaveConfirmationModal
        isEnabled={shouldShowUnsavedChangesWarning && !isCallbackScheduled}
        isLocationAllowed={isLocationAllowed}
        route={route}
      />
    </>
  );
}

export default _.compose(
  Bookmark.loadList(),
  Timelines.loadList(timelineProps),
  connect(mapStateToProps, mapDispatchToProps),
  favicon(({ pageFavicon }) => pageFavicon),
  title(({ card, documentTitle }) => ({
    title: documentTitle || card?.name || t`Question`,
    titleIndex: 1,
  })),
  titleWithLoadingTime("queryStartTime"),
)(QueryBuilder);
