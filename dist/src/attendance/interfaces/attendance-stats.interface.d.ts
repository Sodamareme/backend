export interface DailyStats {
    present: number;
    late: number;
    absent: number;
    total: number;
}
export interface DayStats {
    date: number;
    present: number;
    late: number;
    absent: number;
}
export interface MonthlyStats {
    days: DayStats[];
}
