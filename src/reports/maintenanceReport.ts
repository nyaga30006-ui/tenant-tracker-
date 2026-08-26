import type { MaintenanceIssue, Property } from "../types/domain";
import { downloadTableReport, reportDate, reportMoney } from "./downloadTableReport";

export function downloadMaintenanceReport(property: Property, issues: MaintenanceIssue[], filters: string[] = []): string {
  const total = issues.reduce((sum, issue) => sum + issue.amount, 0);
  return downloadTableReport({
    columns: ["Reported", "Issue", "Category", "Location", "Priority", "Status", "Assigned to", "Cost"],
    filename: "maintenance-report",
    filters,
    propertyAddress: `${property.address}, ${property.city}`,
    propertyName: property.name,
    rows: issues.map((issue) => [reportDate(issue.reportedAt), issue.title, issue.category ?? "maintenance", issue.roomNumber ?? issue.area ?? issue.location ?? "Shared area", issue.priority ?? "medium", issue.status, issue.assignedTo ?? "Unassigned", reportMoney(issue.amount)]),
    summary: [{ label: "Records", value: String(issues.length) }, { label: "Total cost", value: reportMoney(total) }, { label: "Open", value: String(issues.filter((issue) => issue.status !== "completed").length) }, { label: "Completed", value: String(issues.filter((issue) => issue.status === "completed").length) }],
    title: "Maintenance and Costs",
  });
}

