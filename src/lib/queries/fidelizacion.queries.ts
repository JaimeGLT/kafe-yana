export const GET_PERMANENT_PROMOTIONS = `
  query GetPermanentPromotions {
    permanentPromotions {
      nodes {
        id
        name
        description
        isActive
        conditionType
        conditionValue
        rewardType
        rewardValue
        productId
        createdAt
        updatedAt
      }
    }
  }
`;