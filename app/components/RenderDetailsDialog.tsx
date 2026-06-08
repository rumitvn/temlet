import { useState } from "react";
import { Badge, Button, Dialog, Table, THead, TBody, TR, TH, TD } from "@/app/components/ui";

interface RenderDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  renderItem: any;
}

export default function RenderDetailsDialog({
  isOpen,
  onClose,
  renderItem,
}: RenderDetailsDialogProps) {
  const [loading, setLoading] = useState(false);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Render Details"
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-text-muted">File Name</p>
            <p className="text-text">{renderItem.fileName}</p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Status</p>
            <p className="text-text">{renderItem.status}</p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Nexrender UID</p>
            <p className="text-text">{renderItem.nexrenderUid}</p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Render Time</p>
            <p className="text-text">
              {renderItem.renderTime
                ? new Date(renderItem.renderTime * 1000).toLocaleString()
                : "-"}
            </p>
          </div>
        </div>

        {/* Job Status */}
        <div>
          <h3 className="text-lg font-medium text-text">Job Status</h3>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-text-muted">State:</span>
              <Badge status={renderItem.status}>{renderItem.status}</Badge>
            </div>

            {/* Progress Bar */}
            {renderItem.renderProgress !== undefined && (
              <div className="mt-4">
                <div className="w-full bg-surface-sunken rounded-full h-2.5">
                  <div
                    className="bg-accent h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${renderItem.renderProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-text-muted mt-1 text-right">
                  {renderItem.renderProgress}%
                </p>
              </div>
            )}

            {renderItem.error && (
              <div className="mt-2 p-3 bg-danger-bg rounded-lg">
                <span className="text-danger font-medium">Error:</span>
                <p className="text-danger mt-1 text-sm">{renderItem.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Assets */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text-muted">Assets</h4>
          <div className="max-h-60 overflow-y-auto">
            <Table>
              <THead>
                <TR>
                  <TH className="text-xs uppercase tracking-wider">Type</TH>
                  <TH className="text-xs uppercase tracking-wider">Layer</TH>
                  <TH className="text-xs uppercase tracking-wider">
                    Value/Source
                  </TH>
                </TR>
              </THead>
              <TBody>
                {renderItem.templateAeAssets?.map(
                  (asset: any, index: number) => (
                    <TR key={index}>
                      <TD className="whitespace-nowrap">{asset.type}</TD>
                      <TD className="whitespace-nowrap">{asset.layerName}</TD>
                      <TD>{asset.value || asset.src}</TD>
                    </TR>
                  )
                )}
              </TBody>
            </Table>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
