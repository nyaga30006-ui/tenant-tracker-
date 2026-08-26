import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { residencyFixture, roomFixture } from "../../test/fixtures";
import { MoveInTenantDialog } from "./MoveInTenantDialog";
import { MoveOutTenantDialog } from "./MoveOutTenantDialog";

describe("mobile tenant workflows", () => {
  it("completes move-in at a phone-sized viewport", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<MoveInTenantDialog onClose={vi.fn()} onSaved={onSaved} room={roomFixture({ activeResidencyId: undefined, tenant: "" })} />);
    await user.type(screen.getByLabelText("Tenant name"), "  Jane Wanjiku  ");
    await user.type(screen.getByLabelText("Phone number (optional)"), "0712345678");
    await user.click(screen.getByRole("button", { name: "Confirm move-in" }));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ tenantName: "Jane Wanjiku", tenantPhone: "0712345678", rent: 7500 }));
  });

  it("completes move-out and preserves the calculated settlement at a phone-sized viewport", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const onSaved = vi.fn();
    render(<MoveOutTenantDialog onClose={vi.fn()} onSaved={onSaved} residency={residencyFixture()} room={roomFixture({ depositPaid: 7500, paid: 7500 })} />);
    fireEvent.submit(screen.getByRole("button", { name: "Confirm move-out" }).closest("form")!);
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ depositRefunded: 7500, finalBalance: 0 }));
  });
});

