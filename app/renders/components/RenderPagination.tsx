import { motion } from "framer-motion";
import { Select } from "@/app/components/ui";

interface RenderPaginationProps {
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function RenderPagination({
  itemsPerPage,
  onItemsPerPageChange,
  totalPages,
  currentPage,
  onPageChange,
}: RenderPaginationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6 mb-6"
    >
      {/* Items per page selector */}
      <div className="flex items-center gap-2">
        <span className="text-text-muted text-sm">Show:</span>
        <Select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="w-auto px-3 py-1 text-sm"
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </Select>
        <span className="text-text-muted text-sm">per page</span>
      </div>

      {/* Page numbers */}
      <div className="flex gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <motion.button
            key={pageNum}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onPageChange(pageNum)}
            className={`w-10 h-10 rounded-lg ${
              currentPage === pageNum
                ? "bg-accent text-accent-fg"
                : "bg-surface-raised border border-border text-text hover:border-border-strong"
            }`}
          >
            {pageNum}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
