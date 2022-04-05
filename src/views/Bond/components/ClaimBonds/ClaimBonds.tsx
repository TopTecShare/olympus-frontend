import { t, Trans } from "@lingui/macro";
import {
  Box,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import { Paper, PrimaryButton, TertiaryButton, TokenStack } from "@olympusdao/component-library";
import { useState } from "react";
import { DecimalBigNumber } from "src/helpers/DecimalBigNumber/DecimalBigNumber";
import { useCurrentIndex } from "src/hooks/useCurrentIndex";
import { useScreenSize } from "src/hooks/useScreenSize";

import { BondDuration } from "../BondDuration";
import { useBondNotes } from "./hooks/useBondNotes";
import { useClaimBonds } from "./hooks/useClaimBonds";

export const ClaimBonds = () => {
  const notes = useBondNotes().data;
  const isSmallScreen = useScreenSize("sm");
  const claimBondsMutation = useClaimBonds();
  const currentIndex = useCurrentIndex().data;
  const [isPayoutGohm, setIsPayoutGohm] = useState(false);

  if (!notes || notes.length < 1) return null;

  const totalClaimableBalance = notes.reduce((res, note) => note.payout.add(res), new DecimalBigNumber("0", 0));

  return (
    <Paper headerText="Your Bonds">
      <Box display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h4" align="center" color="textSecondary">
          Payout Options
        </Typography>

        <Tabs
          centered
          textColor="primary"
          indicatorColor="primary"
          value={isPayoutGohm ? 1 : 0}
          aria-label="Payout token tabs"
          onChange={(_, view) => setIsPayoutGohm(view === 1)}
        >
          <Tab aria-label="payout-sohm-button" label="sOHM" style={{ fontSize: "1rem" }} />
          <Tab aria-label="payout-sohm-button" label="gOHM" style={{ fontSize: "1rem" }} />
        </Tabs>
      </Box>

      <Box display="flex" justifyContent="center">
        <Box display="flex" flexDirection="column" alignItems="center" mt="24px" width="50%">
          <Typography variant="h5" align="center" color="textSecondary" style={{ fontSize: "1.2rem" }}>
            <Trans>Claimable Balance</Trans>
          </Typography>

          <Box mt="4px" mb="8px">
            <Typography variant="h4" align="center">
              {isPayoutGohm
                ? `${totalClaimableBalance.toString({ decimals: 4, format: true })} gOHM`
                : `${currentIndex?.mul(totalClaimableBalance).toString({ decimals: 4, format: true })} sOHM`}
            </Typography>
          </Box>

          <PrimaryButton
            fullWidth
            className=""
            disabled={claimBondsMutation.isLoading}
            onClick={() => claimBondsMutation.mutate({ isPayoutGohm })}
          >
            {claimBondsMutation.isLoading && claimBondsMutation.variables?.id === "undefined"
              ? t`Claiming all...`
              : t`Claim All`}
          </PrimaryButton>
        </Box>
      </Box>

      <Box mt="48px">
        {isSmallScreen ? (
          <></>
        ) : (
          <TableContainer>
            <Table aria-label="Available bonds" style={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  <TableCell style={{ width: "230px", padding: "8px 0" }}>
                    <Trans>Token</Trans>
                  </TableCell>
                  <TableCell style={{ padding: "8px 0" }}>
                    <Trans>Duration</Trans>
                  </TableCell>
                  <TableCell style={{ padding: "8px 0" }}>
                    <Trans>Remaining</Trans>
                  </TableCell>
                  <TableCell style={{ padding: "8px 0" }}>
                    <Trans>Payout</Trans>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notes.map(note => (
                  <TableRow>
                    <TableCell style={{ padding: "8px 0" }}>
                      {note ? (
                        <Box display="flex" alignItems="center">
                          <TokenStack tokens={note.bond.quoteToken.icons} />

                          <Box display="flex" flexDirection="column" ml="16px">
                            <Typography>{note.bond.quoteToken.name}</Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Skeleton width={120} />
                      )}
                    </TableCell>

                    <TableCell style={{ padding: "8px 0" }}>
                      <BondDuration duration={note.bond.duration} />
                    </TableCell>

                    <TableCell style={{ padding: "8px 0" }}>
                      {Date.now() > note.matured ? (
                        "Fully Vested"
                      ) : (
                        <BondDuration duration={(note.matured - Date.now()) / 1000} />
                      )}
                    </TableCell>

                    <TableCell style={{ padding: "8px 0" }}>
                      {isPayoutGohm
                        ? `${note.payout.toString({ decimals: 4, format: true })} gOHM`
                        : `${currentIndex?.mul(note.payout).toString({ decimals: 4, format: true })} sOHM`}
                    </TableCell>

                    <TableCell style={{ padding: "8px 0" }}>
                      <TertiaryButton
                        fullWidth
                        disabled={Date.now() < note.matured || claimBondsMutation.isLoading}
                        onClick={() => claimBondsMutation.mutate({ id: note.id, isPayoutGohm })}
                      >
                        {claimBondsMutation.isLoading && claimBondsMutation.variables?.id === note.id
                          ? t`Claiming...`
                          : t`Claim`}
                      </TertiaryButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Paper>
  );
};
