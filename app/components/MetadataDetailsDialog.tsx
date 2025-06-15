import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { RenderItem } from '../types/render';
import { XMarkIcon as XMarkIcon } from '@heroicons/react/24/solid';

interface MetadataDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  renderItem: RenderItem;
}

export default function MetadataDetailsDialog({ isOpen, onClose, renderItem }: MetadataDetailsDialogProps) {
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="div"
                  className="flex items-center justify-between mb-4"
                >
                  <h3 className="text-lg font-medium leading-6 text-white">
                    Metadata Details
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-300"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>

                <div className="mt-2 space-y-4">
                  {renderItem.youtubeMetadata ? (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Title</h4>
                        <p className="text-white">{renderItem.youtubeMetadata.title}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
                        <p className="text-white whitespace-pre-wrap">{renderItem.youtubeMetadata.description}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Tags</h4>
                        <p className="text-white">{renderItem.youtubeMetadata.tags}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Category</h4>
                        <p className="text-white">{renderItem.youtubeMetadata.categoryId}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Language</h4>
                        <p className="text-white">
                          {renderItem.youtubeMetadata.defaultLanguage} / {renderItem.youtubeMetadata.defaultAudioLanguage}
                        </p>
                      </div>
                      {renderItem.youtubeMetadata.playlistId && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-1">Playlist ID</h4>
                          <p className="text-white">{renderItem.youtubeMetadata.playlistId}</p>
                        </div>
                      )}
                      {renderItem.youtubeMetadata.scheduleDate && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-1">Schedule Date</h4>
                          <p className="text-white">{renderItem.youtubeMetadata.scheduleDate}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-400">No metadata generated yet</p>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 