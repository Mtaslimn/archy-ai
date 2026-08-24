"use client"

import React, { createContext, useContext, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

export interface Project {
  id: string
  name: string
  role: "owner" | "collaborator"
}

export interface ProjectListItem {
  id: string
  name: string
}

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function createShortSuffix() {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)

  return values[0].toString(36).slice(0, 5)
}

interface ProjectContextType {
  projects: Project[]
  ownedProjects: Project[]
  sharedProjects: Project[]
  currentProjectId: string | null
  activeDialog: "create" | "rename" | "delete" | null
  activeProject: Project | null
  nameInput: string
  roomIdPreview: string
  isLoading: boolean
  setNameInput: (name: string) => void
  openCreateDialog: () => void
  openRenameDialog: (project: Project) => void
  openDeleteDialog: (project: Project) => void
  closeDialog: () => void
  openProject: (projectId: string) => void
  handleCreateProject: () => Promise<void>
  handleRenameProject: () => Promise<void>
  handleDeleteProject: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({
  ownedProjects: initialOwnedProjects,
  sharedProjects: initialSharedProjects,
  currentProjectId = null,
  children,
}: {
  ownedProjects: ProjectListItem[]
  sharedProjects: ProjectListItem[]
  currentProjectId?: string | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeDialog, setActiveDialog] = useState<"create" | "rename" | "delete" | null>(null)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [nameInput, setNameInput] = useState<string>("")
  const [roomIdSuffix, setRoomIdSuffix] = useState(createShortSuffix)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const ownedProjects = useMemo<Project[]>(
    () =>
      initialOwnedProjects.map((project) => ({
        ...project,
        role: "owner",
      })),
    [initialOwnedProjects],
  )
  const sharedProjects = useMemo<Project[]>(
    () =>
      initialSharedProjects.map((project) => ({
        ...project,
        role: "collaborator",
      })),
    [initialSharedProjects],
  )
  const projects = useMemo(
    () => [...ownedProjects, ...sharedProjects],
    [ownedProjects, sharedProjects],
  )
  const roomIdPreview = `${toSlug(nameInput) || "untitled-project"}-${roomIdSuffix}`

  const openCreateDialog = () => {
    setNameInput("")
    setRoomIdSuffix(createShortSuffix())
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

  const openProject = (projectId: string) => {
    router.push(`/editor/${projectId}`)
  }

  const handleCreateProject = async () => {
    if (!nameInput.trim() || isLoading) return
    setIsLoading(true)

    const projectName = nameInput.trim()
    const projectId = roomIdPreview

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          name: projectName,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create project")
      }

      const { project } = (await response.json()) as { project: ProjectListItem }

      setActiveDialog(null)
      setActiveProject(null)
      setNameInput("")
      router.push(`/editor/${project.id}`)
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const handleRenameProject = async () => {
    if (!nameInput.trim() || !activeProject || isLoading) return
    setIsLoading(true)

    try {
      const response = await fetch(`/api/projects/${activeProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      })

      if (!response.ok) {
        throw new Error("Failed to rename project")
      }

      setActiveDialog(null)
      setActiveProject(null)
      setNameInput("")
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!activeProject || isLoading) return
    setIsLoading(true)
    const projectId = activeProject.id

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete project")
      }

      setActiveDialog(null)
      setActiveProject(null)
      setNameInput("")
      if (pathname === `/editor/${projectId}`) {
        router.push("/editor")
      } else {
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProjectContext.Provider
      value={{
        projects,
        ownedProjects,
        sharedProjects,
        currentProjectId,
        activeDialog,
        activeProject,
        nameInput,
        roomIdPreview,
        isLoading,
        setNameInput,
        openCreateDialog,
        openRenameDialog,
        openDeleteDialog,
        closeDialog,
        openProject,
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
