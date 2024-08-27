use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Custom error message")]
    CustomError,

    #[msg("Insufficient funds")]
    InsufficientFunds = 9000,

    #[msg("Maker token account amount is less than offered amount")]
    MakerTokenAccountAmountLessThanOffered = 10000,
}
