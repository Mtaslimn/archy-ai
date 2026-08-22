"use client"

import React, { createContext, useContext, useState } from "react"

export interface Project {
  id: string
  name: string
  slug: string
  role: "owner" | "collaborator"
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: "1",
    name: "E-commerce Platform",
    slug: "e-commerce-platform",
    role: "owner",
  },
  {
    id: "2",
    name: "Marketing Analytics Dashboard",
    slug: "marketing-analytics-dashboard",
    role: "owner",
  },
  {
    id: "3",
    name: "Billing Microservice",
    slug: "billing-microservice",
    role: "collaborator",
  },
  {
    id: "4",
    name: "Data Pipeline Architecture",
    slug: "data-pipeline-architecture",
    role: "collaborator",
  },
]

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

interface ProjectContextType {
  projects: Project[]
  activeDialog: "create" | "rename" | "delete" | null
  activeProject: Project | null
  nameInput: string
  slugPreview: string
  isLoading: boolean
  setNameInput: (name: string) => void
  openCreateDialog: () => void
  openRenameDialog: (project: Project) => void
  openDeleteDialog: (project: Project) => void
  closeDialog: () => void
  handleCreateProject: () => void
  handleRenameProject: () => void
  handleDeleteProject: () => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS)
  const [activeDialog, setActiveDialog] = useState<"create" | "rename" | "delete" | null>(null)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [nameInput, setNameInput] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const slugPreview = toSlug(nameInput)

  const openCreateDialog = () => {
    setNameInput("")
    setActiveProject(null)
    setActiveDialog("create")
  }

  const openRenameDialog = (project: Project) => {
    setNameInput(project.name)
    setActiveProject(project)
    setActiveDialog("rename")
  }

  const openDeleteDialog = (project: Project) => {
    setNameInput("")
    setActiveProject(project)
    setActiveDialog("delete")
  }

  const closeDialog = () => {
    if (isLoading) return
    setActiveDialog(null)
    setActiveProject(null)
    setNameInput("")
  }

  const handleCreateProject = () => {
    if (!nameInput.trim() || isLoading) return
    setIsLoading(true)

    setTimeout(() => {
      const newProj: Project = {
        id: Math.random().toString(36).substring(2, 9),
        name: nameInput.trim(),
        slug: slugPreview || toSlug(nameInput),
        role: "owner",
      }
      setProjects((prev) => [...prev, newProj])
      setIsLoading(false)
      setActiveDialog(null)
      setNameInput("")
    }, 800)
  }

  const handleRenameProject = () => {
    if (!nameInput.trim() || !activeProject || isLoading) return
    setIsLoading(true)

    setTimeout(() => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id
            ? { ...p, name: nameInput.trim(), slug: toSlug(nameInput) }
            : p
        )
      )
      setIsLoading(false)
      setActiveDialog(null)
      setActiveProject(null)
      setNameInput("")
    }, 800)
  }

  const handleDeleteProject = () => {
    if (!activeProject || isLoading) return
    setIsLoading(true)

    setTimeout(() => {
      setProjects((prev) => prev.filter((p) => p.id !== activeProject.id))
      setIsLoading(false)
      setActiveDialog(null)
      setActiveProject(null)
    }, 800)
  }

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeDialog,
        activeProject,
        nameInput,
        slugPreview,
        isLoading,
        setNameInput,
        openCreateDialog,
        openRenameDialog,
        openDeleteDialog,
        closeDialog,
        handleCreateProject,
        handleRenameProject,
        handleDeleteProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjectManager() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error("useProjectManager must be used within a ProjectProvider")
  }
  return context
}
