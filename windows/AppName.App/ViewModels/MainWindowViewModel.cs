using System.Collections.Generic;

namespace AppName.App.ViewModels;

public partial class MainWindowViewModel : ViewModelBase
{
    /// The shell surfaces, keyed by the NavigationView item tag. Mirror your app's
    /// tab set here — same verbs as the other platforms, Windows idiom.
    public IReadOnlyDictionary<string, SectionViewModel> Sections { get; } =
        new Dictionary<string, SectionViewModel>
        {
            ["home"] = new(
                "Home",
                "The app's primary surface — replace with your first real view.",
                new[]
                {
                    "Primary action (the single-action hero)",
                    "Recent activity",
                    "A second entry point",
                }),
            ["library"] = new(
                "Library",
                "A browsing surface — lists/grids define loading, empty, error, offline.",
                new[]
                {
                    "Content collection",
                    "Search and filters",
                }),
            ["settings"] = new(
                "Settings",
                "Account, options, and data. Account affordances live in Settings on every platform.",
                new[]
                {
                    "Sign in / account",
                    "Options",
                    "Data — reset / export",
                    "About + version",
                }),
        };
}
