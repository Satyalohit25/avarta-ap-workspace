import { useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Select } from "../../components/ui/Select";
import { Tabs } from "../../components/ui/Tabs";
import { OperationalReportView } from "./components/OperationalReportView";
import { CfoRoiSimulator } from "./components/CfoRoiSimulator";
import { BarChart3, Calculator } from "lucide-react";

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Operational throughput, executive ROI modeling, and exception metrics."
        action={
          <div className="w-44">
            <Select
              id="reports-timerange-select"
              name="timeRange"
              value={timeRange}
              onValueChange={setTimeRange}
              options={[
                { value: "7d", label: "Last 7 Days" },
                { value: "30d", label: "Last 30 Days" },
                { value: "90d", label: "Last Quarter" },
                { value: "ytd", label: "Year to Date" },
              ]}
            />
          </div>
        }
      />

      <Tabs
        defaultTabId="operational"
        variant="line"
        tabs={[
          {
            id: "operational",
            label: "Operational Throughput & KPIs",
            icon: <BarChart3 size={15} />,
            content: (
              <div className="pt-2">
                <OperationalReportView timeRange={timeRange} />
              </div>
            ),
          },
          {
            id: "cfo-roi",
            label: "CFO Value & ROI Simulator",
            icon: <Calculator size={15} />,
            content: (
              <div className="pt-2">
                <CfoRoiSimulator />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
