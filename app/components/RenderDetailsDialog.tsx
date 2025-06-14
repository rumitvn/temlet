import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { checkRenderStatus } from "../services/render";

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
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && renderItem?.nexrenderUid) {
      // Initial status check
      const checkStatus = async () => {
        try {
          setLoading(true);
          const status = await checkRenderStatus(renderItem.nexrenderUid);
          console.log('Nexrender status:', status);
          setJobStatus(status);
        } catch (error) {
          console.error("Error checking render status:", error);
        } finally {
          setLoading(false);
        }
      };

      checkStatus();

      // Set up polling interval
      const interval = setInterval(checkStatus, 2000); // Poll every 2 seconds

      return () => {
        clearInterval(interval);
      };
    }
  }, [isOpen, renderItem?.nexrenderUid]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white"
                >
                  Render Details
                </Dialog.Title>

                <div className="mt-4 space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">File Name</p>
                      <p className="text-white">{renderItem.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <p className="text-white">{renderItem.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Nexrender UID</p>
                      <p className="text-white">{renderItem.nexrenderUid}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Render Time</p>
                      <p className="text-white">
                        {renderItem.renderTime
                          ? new Date(renderItem.renderTime * 1000).toLocaleString()
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Job Status */}
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-200">Job Status</h3>
                    {loading ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                      </div>
                    ) : jobStatus ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">State:</span>
                          <span className="text-gray-200">{jobStatus.state}</span>
                        </div>
                        
                        {/* Progress Bar */}
                        {jobStatus.renderProgress !== undefined && (
                          <div className="mt-4">
                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                              <div 
                                className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${jobStatus.renderProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-sm text-gray-400 mt-1 text-right">
                              {jobStatus.renderProgress}%
                            </p>
                          </div>
                        )}

                        {jobStatus.error && (
                          <div className="mt-2 p-3 bg-red-500/20 rounded-lg">
                            <span className="text-red-400 font-medium">Error:</span>
                            <p className="text-red-300 mt-1 text-sm">{jobStatus.error}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400 mt-2">No job status available</p>
                    )}
                  </div>

                  {/* Assets */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-400">
                      Assets
                    </h4>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Layer
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Value/Source
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                          {renderItem.templateAeAssets?.map(
                            (asset: any, index: number) => (
                              <tr key={index}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                                  {asset.type}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                                  {asset.layerName}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-300">
                                  {asset.value || asset.src}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 