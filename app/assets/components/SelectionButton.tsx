import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { getSelectionKey } from "../utils";
import type {
  CrawlerResource,
  ResourceType,
  ResourceTarget,
  SelectionState,
} from "../types";

interface SelectionButtonProps {
  resource: CrawlerResource;
  type: ResourceType;
  target: ResourceTarget;
  optionName?: string;
  selectionState: SelectionState;
  onSelect: (
    resourcePath: string,
    type: ResourceType,
    target: ResourceTarget,
    quizOption?: string,
  ) => void;
}

export default function SelectionButton({
  resource,
  type,
  target,
  optionName,
  selectionState,
  onSelect,
}: SelectionButtonProps) {
  const selectionKey = getSelectionKey(resource, type, target, optionName);
  const state = selectionState[selectionKey];

  return (
    <button
      onClick={() => onSelect(resource.path, type, target, optionName)}
      className={`relative px-3 py-1.5 rounded text-sm ${
        state?.isSelected
          ? "bg-success hover:opacity-90"
          : state?.error
            ? "bg-danger hover:opacity-90"
            : type === "quiz3-image"
              ? "bg-accent hover:bg-accent-hover"
              : "bg-info hover:opacity-90"
      } text-white flex items-center gap-2`}
      disabled={state?.isLoading}
    >
      {state?.isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Copying...</span>
        </>
      ) : state?.isSelected ? (
        <>
          <CheckCircleIcon className="w-4 h-4" />
          <span>Selected</span>
        </>
      ) : state?.error ? (
        <>
          <XCircleIcon className="w-4 h-4" />
          <span>Try Again</span>
        </>
      ) : (
        <>{optionName ? `Select for ${optionName}` : "Select"}</>
      )}
    </button>
  );
}
