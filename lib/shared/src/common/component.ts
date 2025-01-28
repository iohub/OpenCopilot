export interface CategoryOption {
    title: string
    model: string
    provider: string
    badge?: string
}

export interface CategoryList {
    title: string
    description?: string
    options: CategoryOption[]
}

export interface ModelPickerProps {
    categories: CategoryList[]
    selectedModel: CategoryOption
    onModelSelect: (model: CategoryOption) => void
}