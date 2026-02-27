declare module 'react-calendar-heatmap' {
    import * as React from 'react';

    export interface HeatmapValue {
        date: string | Date;
        count: number;
        [key: string]: any;
    }

    export interface ReactCalendarHeatmapProps {
        values: HeatmapValue[];
        startDate: string | Date;
        endDate: string | Date;
        classForValue?: (value: HeatmapValue | null) => string;
        showWeekdayLabels?: boolean;
        onClick?: (value: HeatmapValue) => void;
        onMouseOver?: (e: any, value: HeatmapValue) => void;
        onMouseLeave?: (e: any, value: HeatmapValue) => void;
        titleForValue?: (value: HeatmapValue | null) => string;
        tooltipDataAttrs?: (value: HeatmapValue | null) => object;
        horizontal?: boolean;
        showMonthLabels?: boolean;
        monthLabels?: string[];
        weekdayLabels?: string[];
        gutterSize?: number;
        transformDayElement?: (element: React.ReactElement, value: HeatmapValue | null, index: number) => React.ReactElement;
    }

    export default class CalendarHeatmap extends React.Component<ReactCalendarHeatmapProps> { }
}
